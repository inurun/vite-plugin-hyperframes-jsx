// @vitest-environment happy-dom
import { gsap } from "gsap";
import { describe, expect, it, vi } from "vitest";
import { registerClock, requestRender } from "../clock";
import type { MountedComposition } from "../mount";

describe("registerClock", () => {
  it("renders the frame matching the seeked time", () => {
    const renderFrame = vi.fn();
    registerClock("test", { root: null!, renderFrame } as unknown as MountedComposition, 30, 90);
    expect(renderFrame).toHaveBeenLastCalledWith(0);
    const timeline = window.__timelines["test"] as gsap.core.Timeline;
    timeline.seek(1.5, false);
    expect(renderFrame).toHaveBeenLastCalledWith(45);
    timeline.seek(0.51, false);
    expect(renderFrame).toHaveBeenLastCalledWith(15);
    timeline.seek(3, false);
    expect(renderFrame).toHaveBeenLastCalledWith(89);
  });

  it("renders every frame exactly when seeked to n / fps in a long video", () => {
    const fps = 30;
    const total = 18_888;
    const rendered: number[] = [];
    registerClock(
      "long",
      {
        root: null!,
        renderFrame: (frame: number) => rendered.push(frame),
      } as unknown as MountedComposition,
      fps,
      total,
    );
    const timeline = window.__timelines["long"] as gsap.core.Timeline;
    const mismatches: number[] = [];
    for (let n = 1; n < total; n++) {
      timeline.seek(n / fps, false);
      if (rendered.at(-1) !== n) {
        mismatches.push(n);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("swaps the composition and re-renders the current frame", () => {
    const first = vi.fn();
    const clock = registerClock(
      "swap",
      { root: null!, renderFrame: first } as unknown as MountedComposition,
      30,
      90,
    );
    const timeline = window.__timelines["swap"] as gsap.core.Timeline;
    timeline.seek(1, false);
    const second = vi.fn();
    clock.setComposition({ root: null!, renderFrame: second } as unknown as MountedComposition);
    expect(second).toHaveBeenLastCalledWith(30);
    expect(window.__timelines["swap"]).toBe(timeline);
    timeline.seek(2, false);
    expect(second).toHaveBeenLastCalledWith(60);
    expect(first).toHaveBeenLastCalledWith(30);
  });

  it("re-renders the current frame on request", () => {
    const renderFrame = vi.fn();
    registerClock("request", { root: null!, renderFrame } as unknown as MountedComposition, 30, 90);
    (window.__timelines["request"] as gsap.core.Timeline).seek(1, false);
    renderFrame.mockClear();
    requestRender();
    expect(renderFrame).toHaveBeenCalledExactlyOnceWith(30);
  });
});
