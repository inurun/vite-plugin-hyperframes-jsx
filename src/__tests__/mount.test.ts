// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createContext, readContext } from "../context";
import { Fragment, jsx } from "../jsx-runtime";
import { render } from "./render";

describe("mount", () => {
  it("creates host elements with props and React-style styles", async () => {
    const ref = { current: null as Element | null };
    const { get } = await render(
      jsx("div", {
        "data-testid": "box",
        className: "a b",
        htmlFor: "x",
        hidden: true,
        onClick: () => {},
        ref,
        style: { width: 10, opacity: 0.5, zIndex: 2, marginTop: 0, "--gap": 4, WebkitLineClamp: 2 },
        children: [jsx(Fragment, { children: ["hi", 1] }), null, false],
      }),
    );
    const box = get("box");
    expect(box.getAttribute("class")).toBe("a b");
    expect(box.getAttribute("for")).toBe("x");
    expect(box.getAttribute("hidden")).toBe("");
    expect(box.hasAttribute("onclick")).toBe(false);
    expect(box.style.getPropertyValue("width")).toBe("10px");
    expect(box.style.getPropertyValue("opacity")).toBe("0.5");
    expect(box.style.getPropertyValue("z-index")).toBe("2");
    expect(box.style.getPropertyValue("margin-top")).toBe("0px");
    expect(box.style.getPropertyValue("--gap")).toBe("4");
    expect(box.textContent).toBe("hi1");
    expect(ref.current).toBe(box);
  });

  it("creates SVG elements with camelCase and kebab-case attributes", async () => {
    const { get } = await render(
      jsx("svg", {
        "data-testid": "svg",
        viewBox: "0 0 10 10",
        children: jsx("path", { "data-testid": "path", strokeWidth: 2, d: "M0 0" }),
      }),
    );
    const svg = get("svg");
    const path = get("path");
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(path.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 10 10");
    expect(path.getAttribute("stroke-width")).toBe("2");
  });

  it("resolves the nearest context provider", async () => {
    const Theme = createContext("default");
    const Label = ({ id }: { id: string }) =>
      jsx("span", { "data-testid": id, children: readContext(Theme) });
    const { get } = await render([
      jsx(Label, { id: "outside" }),
      jsx(Theme.Provider, {
        value: "outer",
        children: [
          jsx(Theme.Provider, { value: "inner", children: jsx(Label, { id: "inner" }) }),
          jsx(Label, { id: "outer" }),
          jsx(Theme.Consumer, {
            children: (value: string) => jsx("i", { "data-testid": "consumer", children: value }),
          }),
        ],
      }),
    ]);
    expect(get("outside").textContent).toBe("default");
    expect(get("inner").textContent).toBe("inner");
    expect(get("outer").textContent).toBe("outer");
    expect(get("consumer").textContent).toBe("outer");
  });
});
