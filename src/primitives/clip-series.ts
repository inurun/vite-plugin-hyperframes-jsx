import type { StyleObject } from "../dom";
import { Fragment, jsx, type HfElement, type HfNode } from "../jsx-runtime";
import { FILL } from "./fill";
import { Frame } from "./frame";
import { Clip, type ClipProps } from "./clip";

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
export function linear({
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

export type ClipSeriesClipProps = Omit<ClipProps, "from"> & {
  durationInFrames: number;
};

export type ClipSeriesTransitionProps = {
  timing: TransitionTiming;
  /** How both sides are styled while the transition runs (default `slide()`). */
  presentation?: TransitionPresentation;
};

type SeriesClipProps = ClipSeriesClipProps;
type SeriesTransitionProps = ClipSeriesTransitionProps;

function SeriesClip(_props: SeriesClipProps): HfNode {
  throw new Error("<ClipSeries.Clip> must be a child of <ClipSeries>.");
}

function SeriesTransition(_props: SeriesTransitionProps): HfNode {
  throw new Error("<ClipSeries.Transition> must be a child of <ClipSeries>.");
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
    throw new TypeError(`<ClipSeries> only accepts Clip / Transition, got "${node}".`);
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
  const base = { ...FILL, justifyContent: "center", alignItems: "center" };
  return jsx(Frame, {
    style: (frame: number) => ({
      ...base,
      ...presentation.style(transition.timing.progress(toTransitionFrame(frame)), side),
    }),
    children,
  });
}

/**
 * Plays clips back to back. A transition overlaps its two neighbours by its duration:
 * each clip starts at the previous clip durations minus the previous transition
 * durations (never before 0).
 */
function ClipSeriesRoot({ children, ...clipProps }: ClipProps) {
  const items = flatten(children);
  const clips: HfElement[] = [];
  let cursor = 0;
  for (const [index, item] of items.entries()) {
    const transition = transitionProps(item);
    if (transition) {
      const duration = transition.timing.durationInFrames;
      if (!Number.isFinite(duration) || duration < 0) {
        throw new RangeError(
          `<ClipSeries.Transition> durationInFrames must be a non-negative number, got ${duration}.`,
        );
      }
      if (items[index - 1]?.type !== SeriesClip || items[index + 1]?.type !== SeriesClip) {
        throw new TypeError("<ClipSeries.Transition> must sit between two <ClipSeries.Clip>.");
      }
      cursor -= duration;
      continue;
    }
    if (item.type !== SeriesClip) {
      throw new TypeError("<ClipSeries> only accepts Clip / Transition children.");
    }
    const { durationInFrames, children: content, ...props } = item.props as SeriesClipProps;
    if (!Number.isFinite(durationInFrames) || durationInFrames <= 0) {
      throw new RangeError(
        `<ClipSeries.Clip> durationInFrames must be a positive number, got ${durationInFrames}.`,
      );
    }
    const from = Math.max(0, cursor);
    cursor = from + durationInFrames;
    const entering = transitionProps(items[index - 1]);
    const exiting = transitionProps(items[index + 1]);
    // The entering transition starts with the clip, the exiting one ends with it.
    let body: HfNode = content;
    if (entering) {
      body = presented(entering, "entering", (frame) => frame, body);
    }
    if (exiting) {
      const exitStart = durationInFrames - exiting.timing.durationInFrames;
      body = presented(exiting, "exiting", (frame) => frame - exitStart, body);
    }
    clips.push(jsx(Clip, { ...props, from, durationInFrames, children: body }, item.key));
  }
  return jsx(Clip, { ...clipProps, children: clips });
}

/** `Clip`s played back to back, overlapped by the `Transition`s between them. */
export const ClipSeries = Object.assign(ClipSeriesRoot, {
  Clip: SeriesClip,
  Transition: SeriesTransition,
});
