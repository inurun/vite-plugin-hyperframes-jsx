// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { jsx } from "../jsx-runtime";
import { Frame } from "../primitives/frame";
import { linear, slide, ClipSeries } from "../primitives/clip-series";
import { render } from "./render";

const page = (id: string) =>
  jsx(Frame, { "data-testid": id, text: (frame: number) => String(frame) });

const transformOf = (el: HTMLElement) => (el.parentElement as HTMLElement).style.transform;

describe("ClipSeries", () => {
  const tree = jsx(ClipSeries, {
    layout: "none",
    children: [
      jsx(ClipSeries.Clip, { durationInFrames: 30, layout: "none", children: page("a") }, "a"),
      jsx(ClipSeries.Transition, {
        timing: linear({ durationInFrames: 10 }),
        presentation: slide({ direction: "from-right" }),
      }),
      jsx(ClipSeries.Clip, { durationInFrames: 30, layout: "none", children: page("b") }, "b"),
    ],
  });

  it("overlaps neighbouring clips by the transition duration", async () => {
    const { get, visible, renderFrame } = await render(tree);
    renderFrame(19);
    expect(visible("a")).toBe(true);
    expect(visible("b")).toBe(false);
    renderFrame(20);
    expect(visible("b")).toBe(true);
    expect(get("b").textContent).toBe("0");
    renderFrame(29);
    expect(visible("a")).toBe(true);
    renderFrame(30);
    expect(visible("a")).toBe(false);
    renderFrame(49);
    expect(get("b").textContent).toBe("29");
    renderFrame(50);
    expect(visible("b")).toBe(false);
  });

  it("slides both clips during the overlap", async () => {
    const { get, renderFrame } = await render(tree);
    renderFrame(10);
    expect(transformOf(get("a"))).toBe("translateX(0%)");
    renderFrame(25);
    expect(transformOf(get("a"))).toBe("translateX(-50%)");
    expect(transformOf(get("b"))).toBe("translateX(50%)");
    renderFrame(40);
    expect(transformOf(get("b"))).toBe("translateX(0%)");
  });

  it("nests exiting outside entering for a clip between two transitions", async () => {
    const transition = (direction: "from-right" | "from-bottom") =>
      jsx(ClipSeries.Transition, {
        timing: linear({ durationInFrames: 10 }),
        presentation: slide({ direction }),
      });
    const clip = (id: string, durationInFrames: number) =>
      jsx(ClipSeries.Clip, { durationInFrames, layout: "none", children: page(id) }, id);
    const { get, visible, renderFrame } = await render(
      jsx(ClipSeries, {
        layout: "none",
        children: [
          clip("a", 30),
          transition("from-right"),
          clip("b", 40),
          transition("from-bottom"),
          clip("c", 30),
        ],
      }),
    );
    const entering = get("b").parentElement as HTMLElement;
    const exiting = entering.parentElement as HTMLElement;

    renderFrame(19);
    expect(visible("b")).toBe(false);
    renderFrame(20);
    expect(get("b").textContent).toBe("0");

    renderFrame(25);
    expect(entering.style.transform).toBe("translateX(50%)");
    expect(exiting.style.transform).toBe("translateY(0%)");

    renderFrame(55);
    expect(entering.style.transform).toBe("translateX(0%)");
    expect(exiting.style.transform).toBe("translateY(-50%)");
    expect(transformOf(get("c"))).toBe("translateY(50%)");

    renderFrame(60);
    expect(visible("b")).toBe(false);
    expect(get("c").textContent).toBe("10");
  });

  it("starts a clip at 0 when transitions outlast the clips before it", async () => {
    const { get, visible, renderFrame } = await render(
      jsx(ClipSeries, {
        layout: "none",
        children: [
          jsx(ClipSeries.Clip, {
            durationInFrames: 5,
            layout: "none",
            children: page("a"),
          }),
          jsx(ClipSeries.Transition, { timing: linear({ durationInFrames: 10 }) }),
          jsx(ClipSeries.Clip, {
            durationInFrames: 20,
            layout: "none",
            children: page("b"),
          }),
        ],
      }),
    );
    renderFrame(0);
    expect(visible("b")).toBe(true);
    expect(get("b").textContent).toBe("0");
    renderFrame(19);
    expect(get("b").textContent).toBe("19");
  });
});

describe("linear", () => {
  it("clamps progress to [0, 1] and applies the easing", () => {
    const timing = linear({ durationInFrames: 10, easing: (t) => t * t });
    expect(timing.progress(5)).toBe(0.25);
    expect(timing.progress(-1)).toBe(0);
    expect(timing.progress(10)).toBe(1);
    expect(timing.progress(15)).toBe(1);
    expect(linear({ durationInFrames: 4 }).progress(1)).toBe(0.25);
  });

  it("treats a zero-length transition as finished", () => {
    expect(linear({ durationInFrames: 0 }).progress(0)).toBe(1);
  });
});

describe("slide", () => {
  const cases = [
    ["from-left", "translateX", -1],
    ["from-right", "translateX", 1],
    ["from-top", "translateY", -1],
    ["from-bottom", "translateY", 1],
  ] as const;

  it.each(cases)("moves %s in and pushes the other side out", (direction, fn, sign) => {
    const { style } = slide({ direction });
    expect(style(0, "entering").transform).toBe(`${fn}(${sign * 100}%)`);
    expect(style(0.25, "entering").transform).toBe(`${fn}(${sign * 75}%)`);
    expect(style(1, "entering").transform).toBe(`${fn}(0%)`);
    expect(style(0, "exiting").transform).toBe(`${fn}(0%)`);
    expect(style(0.25, "exiting").transform).toBe(`${fn}(${-sign * 25}%)`);
    expect(style(1, "exiting").transform).toBe(`${fn}(${-sign * 100}%)`);
  });

  it("defaults to from-left", () => {
    expect(slide().style(0.5, "entering").transform).toBe("translateX(-50%)");
  });
});
