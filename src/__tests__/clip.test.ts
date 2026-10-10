// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { Clip } from "../clip";
import { jsx } from "../jsx-runtime";
import { getClipTiming, getVideoConfig } from "../scope";
import { render } from "./render";

const timing = (el: HTMLElement) => [el.dataset["start"], el.dataset["duration"]];

describe("Clip", () => {
  it("writes absolute start and duration in seconds, nested clips included", async () => {
    const { get } = await render(
      jsx(Clip, {
        start: 2,
        duration: 5,
        "data-testid": "outer",
        children: jsx(Clip, { start: 1.5, duration: 2, "data-testid": "inner" }),
      }),
    );
    expect(timing(get("outer"))).toEqual(["2", "5"]);
    expect(timing(get("inner"))).toEqual(["3.5", "2"]);
  });

  it("defaults to the rest of the enclosing clip and clamps to it", async () => {
    const { get } = await render([
      jsx(Clip, { start: 4, "data-testid": "rest" }),
      jsx(Clip, {
        start: 1,
        duration: 3,
        children: jsx(Clip, { start: 2, duration: 5, "data-testid": "clamped" }),
      }),
    ]);
    expect(timing(get("rest"))).toEqual(["4", "6"]);
    expect(timing(get("clamped"))).toEqual(["3", "1"]);
  });

  it("snaps both ends to frames so adjacent clips meet on the same frame", async () => {
    const { get } = await render(
      [
        jsx(Clip, { start: 0, duration: 1.01, "data-testid": "a" }),
        jsx(Clip, { start: 1.01, duration: 1, "data-testid": "b" }),
      ],
      { fps: "30" },
    );
    // 1.01 s is 30.3 frames: both clips use frame 30.
    expect(timing(get("a"))).toEqual(["0", "1"]);
    expect(timing(get("b"))).toEqual(["1", "1"]);
  });

  it("skips a clip outside its parent", async () => {
    const { root } = await render(
      jsx(Clip, { duration: 2, children: jsx(Clip, { start: 3, "data-testid": "late" }) }),
    );
    expect(root.querySelector('[data-testid="late"]')).toBeNull();
  });

  it("merges class and style with the clip defaults", async () => {
    const { get } = await render(
      jsx(Clip, {
        "data-testid": "c",
        className: "scene",
        style: { background: "red", inset: 10 },
      }),
    );
    const el = get("c");
    expect(el.className).toBe("clip scene");
    expect(el.style.position).toBe("absolute");
    expect(el.style.background).toBe("red");
    expect(el.style.getPropertyValue("inset")).toBe("10px");
  });

  it("exposes the clip timing and the config to its children", async () => {
    let seen: unknown;
    const Probe = () => {
      seen = { clip: getClipTiming(), config: getVideoConfig() };
      return null;
    };
    await render(jsx(Clip, { start: 1, duration: 2, children: jsx(Probe, {}) }), { fps: "60" });
    expect(seen).toEqual({
      clip: { start: 1, duration: 2 },
      config: { fps: 60, width: 1920, height: 1080, duration: 10 },
    });
  });

  it.each([
    [{ start: Number.NaN }, /start must be a finite number/],
    [{ duration: 0 }, /duration must be a positive number/],
  ])("rejects invalid props %o", async (props, message) => {
    await expect(render(jsx(Clip, props))).rejects.toThrow(message);
  });

  it("refuses to be placed inside svg", async () => {
    await expect(render(jsx("svg", { children: jsx(Clip, {}) }))).rejects.toThrow(
      /not inside <svg>/,
    );
  });
});
