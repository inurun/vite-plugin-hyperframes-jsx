// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { jsx } from "../jsx-runtime";
import { mountComposition } from "../mount";
import { Img } from "../primitives/img";
import { Loop } from "../primitives/loop";
import { Sequence } from "../primitives/sequence";
import { TimeShift } from "../primitives/time-shift";
import { linearTiming, TransitionSeries } from "../primitives/transition-series";
import { onMounted, registerUpdater, useVideoConfig } from "../scope";
import { render } from "./render";

const config = { fps: 30, width: 1920, height: 1080, durationInFrames: 100 };

describe("mountComposition", () => {
  it("rejects an unusable config", async () => {
    const container = document.createElement("div");
    await expect(mountComposition(null, container, { ...config, fps: 0 })).rejects.toThrow(/fps/);
    await expect(
      mountComposition(null, container, { ...config, durationInFrames: 1.5 }),
    ).rejects.toThrow(/durationInFrames/);
    await expect(mountComposition(null, container, { ...config, width: -1 })).rejects.toThrow(
      /width and height/,
    );
  });

  it("removes only its own nodes on dispose", async () => {
    const container = document.createElement("div");
    container.append(document.createElement("header"));
    const composition = await mountComposition([jsx("p", {}), jsx("p", {})], container, config);
    expect(container.children).toHaveLength(3);
    expect(composition.config).toBe(config);
    composition.dispose();
    expect(container.innerHTML).toBe("<header></header>");
  });

  it("explains that build-time hooks cannot run in onMounted", async () => {
    const Probe = () => {
      onMounted(() => registerUpdater(() => {}));
      return null;
    };
    await expect(render(jsx(Probe, {}))).rejects.toThrow(
      /registerUpdater\(\) can only be called while mountComposition\(\) mounts the tree/,
    );
    expect(() => useVideoConfig()).toThrow(/useVideoConfig\(\)/);
  });
});

describe("Img", () => {
  it("warns about an image that cannot be decoded and still mounts", async () => {
    const decode = vi
      .spyOn(HTMLImageElement.prototype, "decode")
      .mockRejectedValue(new Error("broken"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = await render(jsx(Img, { src: "missing.png" }));
    expect(container.querySelector("img")?.getAttribute("src")).toBe("missing.png");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"missing.png"'), expect.any(Error));
    decode.mockRestore();
    warn.mockRestore();
  });
});

describe("validation", () => {
  it.each([
    ["Sequence from", jsx(Sequence, { from: Number.NaN }), /from must be a finite number/],
    ["Sequence duration", jsx(Sequence, { durationInFrames: -1 }), /must not be negative/],
    ["Loop duration", jsx(Loop, { durationInFrames: 0 }), /positive number/],
    ["Loop times", jsx(Loop, { durationInFrames: 5, times: 1.5 }), /positive integer/],
    ["TimeShift by", jsx(TimeShift, { by: Infinity }), /finite number/],
  ])("rejects an invalid %s", async (_name, tree, message) => {
    await expect(render(tree)).rejects.toThrow(message);
  });

  const sequence = (durationInFrames: number) =>
    jsx(TransitionSeries.Sequence, { durationInFrames });
  const transition = (durationInFrames: number) =>
    jsx(TransitionSeries.Transition, { timing: linearTiming({ durationInFrames }) });

  it.each([
    ["a leading transition", [transition(5), sequence(10)], /between two/],
    ["a trailing transition", [sequence(10), transition(5)], /between two/],
    [
      "adjacent transitions",
      [sequence(10), transition(5), transition(5), sequence(10)],
      /between two/,
    ],
    ["a negative transition", [sequence(10), transition(-1), sequence(10)], /non-negative/],
    ["an empty sequence", [sequence(0)], /positive number/],
  ])("rejects %s in a TransitionSeries", async (_name, children, message) => {
    await expect(render(jsx(TransitionSeries, { children }))).rejects.toThrow(message);
  });
});
