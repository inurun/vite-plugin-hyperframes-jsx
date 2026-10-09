import type { StyleObject } from "../dom";
import { Fragment, jsx, type HfElement, type HfNode } from "../jsx-runtime";
import { ABSOLUTE_FILL } from "./absolute-fill";
import { Frame } from "./frame";
import { Sequence, type SequenceProps } from "./sequence";

/** How long a transition lasts and how its progress grows. */
export type TransitionTiming = {
  durationInFrames: number;
  /** Transition-local frame → progress in [0, 1]. */
  progress: (frame: number) => number;
};

/** Styles the wrapper of each side of a transition from its progress in [0, 1]. */
export type TransitionPresentation = {
  style: (progress: number, side: "entering" | "exiting") => StyleObject;
};

/** Progress grows linearly over `durationInFrames`, optionally reshaped by `easing`. */
export function linearTiming({
  durationInFrames,
  easing = (t) => t,
}: {
  durationInFrames: number;
  easing?: (t: number) => number;
}): TransitionTiming {
  return {
    durationInFrames,
    progress: (frame) =>
      easing(durationInFrames > 0 ? Math.min(1, Math.max(0, frame / durationInFrames)) : 1),
  };
}

export type SlideDirection = "from-left" | "from-right" | "from-top" | "from-bottom";

/** Where the entering slide starts, in percent of its own size. */
const SLIDE_ORIGIN: Record<SlideDirection, { axis: "X" | "Y"; start: number }> = {
  "from-left": { axis: "X", start: -100 },
  "from-right": { axis: "X", start: 100 },
  "from-top": { axis: "Y", start: -100 },
  "from-bottom": { axis: "Y", start: 100 },
};

/** The entering slide pushes the exiting one out along the same axis. */
export function slide({
  direction = "from-left",
}: { direction?: SlideDirection } = {}): TransitionPresentation {
  const { axis, start } = SLIDE_ORIGIN[direction];
  return {
    style: (progress, side) => {
      const offset = side === "entering" ? start * (1 - progress) : -start * progress;
      // `+ 0` turns -0 into 0.
      return { transform: `translate${axis}(${offset + 0}%)` };
    },
  };
}

export type TransitionSeriesSequenceProps = Omit<SequenceProps, "from"> & {
  durationInFrames: number;
};

export type TransitionSeriesTransitionProps = {
  timing: TransitionTiming;
  /** How both sides are styled while the transition runs (default `slide()`). */
  presentation?: TransitionPresentation;
};

type SeriesSequenceProps = TransitionSeriesSequenceProps;
type SeriesTransitionProps = TransitionSeriesTransitionProps;

function SeriesSequence(_props: SeriesSequenceProps): HfNode {
  throw new Error("<TransitionSeries.Sequence> must be a child of <TransitionSeries>.");
}

function SeriesTransition(_props: SeriesTransitionProps): HfNode {
  throw new Error("<TransitionSeries.Transition> must be a child of <TransitionSeries>.");
}

function flatten(node: unknown, out: HfElement[] = []): HfElement[] {
  if (Array.isArray(node)) {
    for (const child of node) {
      flatten(child, out);
    }
  } else if (typeof node === "object" && node !== null) {
    const element = node as HfElement;
    if (element.type === Fragment) {
      flatten(element.props["children"], out);
    } else {
      out.push(element);
    }
  } else if (typeof node === "string" && node.trim() !== "") {
    throw new TypeError(`<TransitionSeries> only accepts Sequence / Transition, got "${node}".`);
  }
  return out;
}

function transitionProps(item: HfElement | undefined) {
  return item?.type === SeriesTransition ? (item.props as SeriesTransitionProps) : null;
}

/** A full-size wrapper styled by the transition progress at `toTransitionFrame(frame)`. */
function presented(
  transition: SeriesTransitionProps,
  side: "entering" | "exiting",
  toTransitionFrame: (frame: number) => number,
  children: HfNode,
) {
  const presentation = transition.presentation ?? slide();
  const base = { ...ABSOLUTE_FILL, justifyContent: "center", alignItems: "center" };
  return jsx(Frame, {
    style: (frame: number) => ({
      ...base,
      ...presentation.style(transition.timing.progress(toTransitionFrame(frame)), side),
    }),
    children,
  });
}

/**
 * Plays sequences back to back. A transition overlaps its two neighbours by its duration:
 * each sequence starts at the previous sequence durations minus the previous transition
 * durations (never before 0).
 */
function TransitionSeriesRoot({ children, ...sequenceProps }: SequenceProps) {
  const items = flatten(children);
  const sequences: HfElement[] = [];
  let cursor = 0;
  for (const [index, item] of items.entries()) {
    const transition = transitionProps(item);
    if (transition) {
      const duration = transition.timing.durationInFrames;
      if (!Number.isFinite(duration) || duration < 0) {
        throw new RangeError(
          `<TransitionSeries.Transition> durationInFrames must be a non-negative number, got ${duration}.`,
        );
      }
      if (items[index - 1]?.type !== SeriesSequence || items[index + 1]?.type !== SeriesSequence) {
        throw new TypeError(
          "<TransitionSeries.Transition> must sit between two <TransitionSeries.Sequence>.",
        );
      }
      cursor -= duration;
      continue;
    }
    if (item.type !== SeriesSequence) {
      throw new TypeError("<TransitionSeries> only accepts Sequence / Transition children.");
    }
    const { durationInFrames, children: content, ...props } = item.props as SeriesSequenceProps;
    if (!Number.isFinite(durationInFrames) || durationInFrames <= 0) {
      throw new RangeError(
        `<TransitionSeries.Sequence> durationInFrames must be a positive number, got ${durationInFrames}.`,
      );
    }
    const from = Math.max(0, cursor);
    cursor = from + durationInFrames;
    const entering = transitionProps(items[index - 1]);
    const exiting = transitionProps(items[index + 1]);
    // The entering transition starts with the sequence, the exiting one ends with it.
    let body: HfNode = content;
    if (entering) {
      body = presented(entering, "entering", (frame) => frame, body);
    }
    if (exiting) {
      const exitStart = durationInFrames - exiting.timing.durationInFrames;
      body = presented(exiting, "exiting", (frame) => frame - exitStart, body);
    }
    sequences.push(jsx(Sequence, { ...props, from, durationInFrames, children: body }, item.key));
  }
  return jsx(Sequence, { ...sequenceProps, children: sequences });
}

/** `Sequence`s played back to back, overlapped by the `Transition`s between them. */
export const TransitionSeries = Object.assign(TransitionSeriesRoot, {
  Sequence: SeriesSequence,
  Transition: SeriesTransition,
});
