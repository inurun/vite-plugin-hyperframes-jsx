import { HTML_NS, type StyleObject } from "./dom";
import type { HfNode, HtmlProps } from "./jsx-runtime";
import { defineMount, mount, mountHost } from "./mount";
import { getBuildState, withClip } from "./scope";

export type ClipProps = Omit<HtmlProps<"div">, "style"> & {
  /** Start in seconds, relative to the enclosing clip (default 0). */
  start?: number;
  /** Length in seconds (default: until the enclosing clip ends). A zero-length clip is not mounted. */
  duration?: number;
  /** Merged over the default `position: absolute; inset: 0`. */
  style?: StyleObject;
  children?: HfNode;
};

/** Seconds as written to `data-*`: frame-exact values, without float noise. */
function formatSeconds(frames: number, fps: number) {
  return String(Number((frames / fps).toFixed(6)));
}

/**
 * A HyperFrames clip: a `div` with `data-start` / `data-duration` (absolute seconds), shown
 * and hidden by HyperFrames. Both ends snap to the frame grid, so clips that meet in seconds
 * meet on the same frame; nested clips snap their own absolute times (not their parent's
 * snapped start plus an offset), then are clamped to the parent. CSS animations inside it
 * start with it.
 */
export const Clip = defineMount<ClipProps>(
  ({ start = 0, duration, className, class: classAttr, style, children, ...props }, ctx) => {
    const { config, clip: parent } = getBuildState();
    if (!Number.isFinite(start)) {
      throw new RangeError(`<Clip> start must be a finite number, got ${start}.`);
    }
    if (duration !== undefined && !(Number.isFinite(duration) && duration >= 0)) {
      throw new RangeError(`<Clip> duration must be a non-negative number, got ${duration}.`);
    }
    if (ctx.ns !== HTML_NS) {
      throw new Error("<Clip> must be placed in HTML content, not inside <svg>.");
    }
    const { fps } = config;
    const parentStart = Math.round(parent.start * fps);
    const parentEnd = Math.round((parent.start + parent.duration) * fps);
    const exactStart = parent.exactStart + start;
    const from = Math.max(parentStart, Math.round(exactStart * fps));
    const to = Math.min(
      parentEnd,
      duration === undefined ? parentEnd : Math.round((exactStart + duration) * fps),
    );
    if (to <= from) {
      // Empty, or entirely outside the enclosing clip: never visible.
      return;
    }
    const el = mountHost(
      "div",
      {
        ...props,
        className: ["clip", className ?? classAttr].filter(Boolean).join(" "),
        "data-start": formatSeconds(from, fps),
        "data-duration": formatSeconds(to - from, fps),
        style: { position: "absolute", inset: 0, ...style },
      },
      ctx,
    );
    withClip({ start: from / fps, duration: (to - from) / fps, exactStart }, () =>
      mount(children, { parent: el, ns: HTML_NS }),
    );
  },
);
