import { gsap } from "gsap";
import type { MountedComposition } from "./mount";

declare global {
  interface Window {
    __timelines: Record<string, unknown>;
    gsap?: typeof gsap;
  }
}

export type Clock = {
  /** Renders a freshly mounted tree on the same timeline at the current time. */
  setComposition: (composition: MountedComposition) => void;
};

/** In frames (~33 µs at 30 fps): absorbs float error, far below a visible offset. */
export const FRAME_EPSILON = 1e-3;

let rerender: (() => void) | null = null;

/** Re-renders the current frame of the registered clock, e.g. after async data arrived. */
export function requestRender() {
  rerender?.();
}

/**
 * GSAP is only the seekable clock: one linear proxy tween whose onUpdate
 * evaluates every frame-pure updater. HF seeks with `timeline.seek(t, false)`.
 */
export function registerClock(
  compositionId: string,
  composition: MountedComposition,
  fps: number,
  durationInFrames: number,
): Clock {
  window.gsap = gsap;
  window.__timelines ??= {};
  const proxy = { frame: 0 };
  let current = composition;
  let lastFrame = -1;
  const render = () => {
    // HF seeks to exact frame times (n / fps); GSAP's rounding leaves the tween value up to a
    // few µ-frames below n late in long videos, so a tiny epsilon floored every 3rd frame to n - 1.
    const frame = Math.min(durationInFrames - 1, Math.floor(proxy.frame + FRAME_EPSILON));
    if (frame === lastFrame) {
      return;
    }
    lastFrame = frame;
    current.renderFrame(frame);
  };
  const timeline = gsap.timeline({ paused: true });
  timeline.to(proxy, {
    frame: durationInFrames,
    duration: durationInFrames / fps,
    ease: "none",
    onUpdate: render,
  });
  render();
  window.__timelines[compositionId] = timeline;
  const renderCurrent = () => {
    lastFrame = -1;
    render();
  };
  rerender = renderCurrent;

  return {
    setComposition: (next) => {
      current = next;
      renderCurrent();
    },
  };
}
