import { gsap } from "gsap";
import type { MountedComposition } from "./mount";

export type Clock = {
  /** The paused timeline published on `window.__timelines[compositionId]`. */
  timeline: gsap.core.Timeline;
  /** Renders a freshly mounted tree on the same timeline at the current time (e.g. on HMR). */
  setComposition: (composition: MountedComposition) => void;
  /** Re-renders the current frame, e.g. after async data arrived. */
  requestRender: () => void;
  /** Kills the timeline and unpublishes it from `window.__timelines`. */
  dispose: () => void;
};

/** In frames (~33 µs at 30 fps): absorbs float error, far below a visible offset. */
export const FRAME_EPSILON = 1e-3;

type HfWindow = { __timelines?: Record<string, unknown>; gsap?: unknown };

// Kept on globalThis so that two copies of this module share the registered clocks.
const CLOCKS_KEY = Symbol.for("hf.clocks");
const clocks: Map<string, Clock> = ((globalThis as { [CLOCKS_KEY]?: Map<string, Clock> })[
  CLOCKS_KEY
] ??= new Map());

/** Re-renders the current frame of every registered clock, e.g. after async data arrived. */
export function requestRender() {
  for (const clock of clocks.values()) {
    clock.requestRender();
  }
}

/**
 * Publishes a paused GSAP timeline on `window.__timelines[compositionId]` for HyperFrames to
 * seek. GSAP is only the seekable clock: one linear proxy tween whose onUpdate renders the
 * frame at the seeked time. HF seeks with `timeline.seek(t, false)`.
 *
 * Registering the same `compositionId` again disposes the previous clock.
 */
export function registerClock(compositionId: string, composition: MountedComposition): Clock {
  clocks.get(compositionId)?.dispose();
  const { fps, durationInFrames } = composition.config;
  const hfWindow = window as unknown as HfWindow;
  // HyperFrames drives GSAP through `window.gsap`; it must be the instance owning the timeline.
  hfWindow.gsap = gsap;
  const timelines = (hfWindow.__timelines ??= {});
  const proxy = { frame: 0 };
  let current = composition;
  let lastFrame = -1;
  let disposed = false;
  const render = () => {
    if (disposed) {
      return;
    }
    // HF seeks to exact frame times (n / fps); GSAP's rounding leaves the tween value up to a
    // few µ-frames below n late in long videos, so a tiny epsilon floored every 3rd frame to n - 1.
    const frame = Math.min(durationInFrames - 1, Math.floor(proxy.frame + FRAME_EPSILON));
    if (frame === lastFrame) {
      return;
    }
    lastFrame = frame;
    current.renderFrame(frame);
  };
  const renderCurrent = () => {
    lastFrame = -1;
    render();
  };
  const timeline = gsap.timeline({ paused: true });
  timeline.to(proxy, {
    frame: durationInFrames,
    duration: durationInFrames / fps,
    ease: "none",
    onUpdate: render,
  });
  render();
  timelines[compositionId] = timeline;

  const clock: Clock = {
    timeline,
    setComposition: (next) => {
      if (next.config.fps !== fps || next.config.durationInFrames !== durationInFrames) {
        throw new Error(
          "setComposition() needs the same fps and durationInFrames; call registerClock() again instead.",
        );
      }
      current = next;
      renderCurrent();
    },
    requestRender: renderCurrent,
    dispose: () => {
      disposed = true;
      if (clocks.get(compositionId) === clock) {
        clocks.delete(compositionId);
      }
      timeline.kill();
      if (timelines[compositionId] === timeline) {
        delete timelines[compositionId];
      }
    },
  };
  clocks.set(compositionId, clock);
  return clock;
}
