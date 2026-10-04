// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { jsx } from "../jsx-runtime";
import { Frame } from "../primitives/frame";
import { Loop } from "../primitives/loop";
import { Sequence } from "../primitives/sequence";
import { TimeShift } from "../primitives/time-shift";
import { useSequenceTiming, useVideoConfig } from "../scope";
import { render } from "./render";

const frameText = (id: string) =>
  jsx(Frame, { "data-testid": id, text: (frame: number) => String(frame) });

describe("Sequence", () => {
  it("shows children only inside its range with local frames", async () => {
    const { get, visible, renderFrame } = await render(
      jsx(Sequence, { from: 10, durationInFrames: 20, children: frameText("a") }),
    );
    renderFrame(9);
    expect(visible("a")).toBe(false);
    renderFrame(10);
    expect(visible("a")).toBe(true);
    expect(get("a").textContent).toBe("0");
    renderFrame(29);
    expect(get("a").textContent).toBe("19");
    renderFrame(30);
    expect(visible("a")).toBe(false);
  });

  it("exposes the absolute start and duration of nested sequences", async () => {
    const timings: ReturnType<typeof useSequenceTiming>[] = [];
    const Probe = () => {
      timings.push(useSequenceTiming());
      return null;
    };
    await render(
      jsx(Sequence, {
        from: 10,
        durationInFrames: 50,
        children: [
          jsx(Probe, {}),
          jsx(Sequence, { from: 15, durationInFrames: 100, children: jsx(Probe, {}) }),
        ],
      }),
      100,
    );
    expect(timings).toEqual([
      { fromFrame: 10, durationInFrames: 50 },
      { fromFrame: 25, durationInFrames: 35 },
    ]);
  });

  it("clips nested durations and exposes them through useVideoConfig", async () => {
    const durations: number[] = [];
    const Probe = ({ id }: { id: string }) => {
      durations.push(useVideoConfig().durationInFrames);
      return frameText(id);
    };
    const { get, visible, renderFrame } = await render(
      jsx(Sequence, {
        from: 10,
        durationInFrames: 20,
        children: [
          jsx(Probe, { id: "outer" }),
          jsx(Sequence, { from: 15, durationInFrames: 100, children: jsx(Probe, { id: "inner" }) }),
        ],
      }),
      100,
    );
    expect(durations).toEqual([20, 5]);
    renderFrame(26);
    expect(get("inner").textContent).toBe("1");
    renderFrame(30);
    expect(visible("inner")).toBe(false);
  });

  it("uses a display:contents wrapper for layout none and absolute fill otherwise", async () => {
    const { container } = await render([
      jsx(Sequence, { layout: "none", children: "a" }),
      jsx(Sequence, { className: "s", style: { zIndex: 3 }, children: "b" }),
    ]);
    const [none, fill] = Array.from(container.children) as HTMLElement[];
    expect(none.style.display).toBe("contents");
    expect(fill.getAttribute("class")).toBe("s");
    expect(fill.style.position).toBe("absolute");
    expect(fill.style.zIndex).toBe("3");
  });
});

describe("Loop", () => {
  it("maps frames modulo the loop length and reports it as duration", async () => {
    let duration = 0;
    const Probe = () => {
      duration = useVideoConfig().durationInFrames;
      return frameText("l");
    };
    const { get, visible, renderFrame } = await render(
      jsx(Loop, { durationInFrames: 10, times: 2, children: jsx(Probe, {}) }),
    );
    expect(duration).toBe(10);
    renderFrame(3);
    expect(get("l").textContent).toBe("3");
    renderFrame(13);
    expect(get("l").textContent).toBe("3");
    renderFrame(20);
    expect(visible("l")).toBe(false);
  });
});

describe("TimeShift", () => {
  it("evaluates descendants at frame - by, including fractional offsets", async () => {
    const { get, visible, renderFrame } = await render([
      jsx(TimeShift, { by: 2.5, children: frameText("shifted") }),
      jsx(TimeShift, {
        by: 5,
        children: jsx(Sequence, { from: 10, durationInFrames: 5, children: frameText("seq") }),
      }),
    ]);
    renderFrame(10);
    expect(get("shifted").textContent).toBe("7.5");
    expect(visible("seq")).toBe(false);
    renderFrame(15);
    expect(visible("seq")).toBe(true);
    expect(get("seq").textContent).toBe("0");
  });

  it("takes a frame-dependent offset", async () => {
    const { get, renderFrame } = await render(
      jsx(TimeShift, { by: (frame: number) => frame - 3, children: frameText("frozen") }),
    );
    renderFrame(10);
    expect(get("frozen").textContent).toBe("3");
    renderFrame(40);
    expect(get("frozen").textContent).toBe("3");
  });
});
