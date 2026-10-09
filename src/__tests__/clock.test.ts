// @vitest-environment happy-dom
import type { gsap } from "gsap";
import { describe, expect, it, vi } from "vitest";
import { registerClock, requestRender } from "../clock";
import type { MountedComposition } from "../mount";

const composition = (
  renderFrame: (frame: number) => unknown,
  durationInFrames = 90,
): MountedComposition => ({
  config: { fps: 30, width: 1920, height: 1080, durationInFrames },
  renderFrame,
  dispose: () => {},
});

const timelines = () => (window as unknown as { __timelines: Record<string, unknown> }).__timelines;
const timelineOf = (id: string) => timelines()[id] as gsap.core.Timeline;

describe("registerClock", () => {
  it("renders the frame matching the seeked time", () => {
    const renderFrame = vi.fn();
    const clock = registerClock("test", composition(renderFrame));
    expect(renderFrame).toHaveBeenLastCalledWith(0);
    const timeline = timelineOf("test");
    expect(clock.timeline).toBe(timeline);
    timeline.seek(1.5, false);
    expect(renderFrame).toHaveBeenLastCalledWith(45);
    timeline.seek(0.51, false);
    expect(renderFrame).toHaveBeenLastCalledWith(15);
    timeline.seek(3, false);
    expect(renderFrame).toHaveBeenLastCalledWith(89);
  });

  it("publishes the GSAP instance owning the timeline", () => {
    registerClock(
      "gsap",
      composition(() => {}),
    );
    const { gsap } = window as unknown as { gsap: typeof import("gsap").gsap };
    expect(gsap.core.Timeline).toBeDefined();
    expect(timelineOf("gsap")).toBeInstanceOf(gsap.core.Timeline);
  });

  it("renders every frame exactly when seeked to n / fps in a long video", () => {
    const fps = 30;
    const total = 18_888;
    const rendered: number[] = [];
    registerClock(
      "long",
      composition((frame) => rendered.push(frame), total),
    );
    const timeline = timelineOf("long");
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
    const clock = registerClock("swap", composition(first));
    const timeline = timelineOf("swap");
    timeline.seek(1, false);
    const second = vi.fn();
    clock.setComposition(composition(second));
    expect(second).toHaveBeenLastCalledWith(30);
    expect(timelineOf("swap")).toBe(timeline);
    timeline.seek(2, false);
    expect(second).toHaveBeenLastCalledWith(60);
    expect(first).toHaveBeenLastCalledWith(30);
  });

  it("refuses a composition with another duration", () => {
    const clock = registerClock(
      "swap-length",
      composition(() => {}),
    );
    expect(() => clock.setComposition(composition(() => {}, 60))).toThrow(/same fps/);
  });

  it("re-renders the current frame of every clock on request", () => {
    const a = vi.fn();
    const b = vi.fn();
    const clockA = registerClock("request-a", composition(a));
    registerClock("request-b", composition(b));
    timelineOf("request-a").seek(1, false);
    timelineOf("request-b").seek(2, false);
    a.mockClear();
    b.mockClear();
    requestRender();
    expect(a).toHaveBeenCalledExactlyOnceWith(30);
    expect(b).toHaveBeenCalledExactlyOnceWith(60);
    clockA.requestRender();
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("unpublishes the timeline on dispose", () => {
    const renderFrame = vi.fn();
    const clock = registerClock("dispose", composition(renderFrame));
    clock.dispose();
    expect(timelines()["dispose"]).toBeUndefined();
    renderFrame.mockClear();
    requestRender();
    expect(renderFrame).not.toHaveBeenCalled();
  });

  it("disposes the previous clock registered under the same id", () => {
    const first = vi.fn();
    const old = registerClock("again", composition(first));
    const next = registerClock(
      "again",
      composition(() => {}),
    );
    expect(timelineOf("again")).toBe(next.timeline);
    first.mockClear();
    requestRender();
    old.timeline.seek(2, false);
    expect(first).not.toHaveBeenCalled();
  });
});
