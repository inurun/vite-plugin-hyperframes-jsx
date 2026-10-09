// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { applyProps, applyStyle, SVG_NS } from "../dom";

describe("applyStyle", () => {
  it("adds px to numbers except unitless and custom properties", () => {
    const el = document.createElement("div");
    applyStyle(el, { width: 10, lineHeight: 1.5, WebkitLineClamp: 2, "--gap": 4, margin: 0 });
    expect(el.style.getPropertyValue("width")).toBe("10px");
    expect(el.style.getPropertyValue("line-height")).toBe("1.5");
    expect(el.style.getPropertyValue("-webkit-line-clamp")).toBe("2");
    expect(el.style.getPropertyValue("--gap")).toBe("4");
    expect(el.style.getPropertyValue("margin")).toBe("0px");
  });

  it("removes properties that disappeared or became null", () => {
    const el = document.createElement("div");
    applyStyle(el, { top: 1, left: 2 });
    applyStyle(el, { top: undefined, right: 3 }, { top: 1, left: 2 });
    expect(el.style.top).toBe("");
    expect(el.style.left).toBe("");
    expect(el.style.right).toBe("3px");
  });
});

describe("applyProps", () => {
  it("stringifies booleans on data-* and aria-* as React does", () => {
    const el = document.createElement("div");
    applyProps(el, { "aria-hidden": false, "data-on": true, hidden: false, inert: true }, false);
    expect(el.getAttribute("aria-hidden")).toBe("false");
    expect(el.getAttribute("data-on")).toBe("true");
    expect(el.hasAttribute("hidden")).toBe(false);
    expect(el.getAttribute("inert")).toBe("");
  });

  it("keeps camelCase SVG attributes and kebab-cases the others", () => {
    const el = document.createElementNS(SVG_NS, "fePointLight");
    applyProps(el, { pointsAtX: 1, strokeLinecap: "round", xlinkHref: "#a" }, true);
    expect(el.getAttribute("pointsAtX")).toBe("1");
    expect(el.getAttribute("stroke-linecap")).toBe("round");
    expect(el.getAttribute("href")).toBe("#a");
  });

  it("sets a string style and inner HTML as authored", () => {
    const el = document.createElement("div");
    applyProps(el, { style: "color: red", dangerouslySetInnerHTML: { __html: "<b>x</b>" } }, false);
    expect(el.getAttribute("style")).toBe("color: red");
    expect(el.innerHTML).toBe("<b>x</b>");
  });
});
