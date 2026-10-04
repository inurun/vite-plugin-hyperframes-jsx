// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { jsx } from "../jsx-runtime";
import { Frame } from "../primitives/frame";
import { afterMounted, onMounted } from "../scope";
import { render } from "./render";

describe("Frame", () => {
  it("applies frame-derived styles as a diff", async () => {
    const { get, renderFrame } = await render(
      jsx(Frame, {
        as: "span",
        "data-testid": "f",
        style: (frame: number) => (frame < 5 ? { opacity: frame / 10, left: frame } : { top: 1 }),
      }),
    );
    const el = get("f");
    expect(el.tagName).toBe("SPAN");
    renderFrame(2);
    expect(el.style.opacity).toBe("0.2");
    expect(el.style.left).toBe("2px");
    renderFrame(6);
    expect(el.style.opacity).toBe("");
    expect(el.style.left).toBe("");
    expect(el.style.top).toBe("1px");
  });

  it("updates frame-derived attributes on a component forwarding ref", async () => {
    const Img = (props: Record<string, unknown>) => jsx("img", props);
    const { get, renderFrame } = await render(
      jsx(Frame, {
        as: Img,
        "data-testid": "f",
        attrs: (frame: number) =>
          frame < 5 ? { "data-x": frame, "data-y": 1 } : { "data-x": undefined },
      }),
    );
    const el = get("f");
    expect(el.tagName).toBe("IMG");
    renderFrame(3);
    expect(el.getAttribute("data-x")).toBe("3");
    expect(el.getAttribute("data-y")).toBe("1");
    renderFrame(6);
    expect(el.hasAttribute("data-x")).toBe(false);
    expect(el.hasAttribute("data-y")).toBe(false);
  });
});

describe("onMounted", () => {
  it("runs after mount in order and awaits promises", async () => {
    const order: string[] = [];
    const Measured = () => {
      onMounted(async () => {
        order.push(`first:${document.querySelector("[data-testid=late]") !== null}`);
        await Promise.resolve();
        order.push("first:done");
      });
      return null;
    };
    await render([
      jsx(Measured, {}),
      jsx("div", { "data-testid": "late" }),
      jsx(() => {
        onMounted(() => {
          order.push("second");
        });
        return null;
      }, {}),
    ]);
    expect(order).toEqual(["first:true", "first:done", "second"]);
  });

  it("runs afterMounted callbacks once every onMounted callback finished", async () => {
    const order: string[] = [];
    await render(
      jsx(() => {
        afterMounted(() => {
          order.push("after");
        });
        onMounted(async () => {
          await Promise.resolve();
          order.push("mounted");
        });
        return null;
      }, {}),
    );
    expect(order).toEqual(["mounted", "after"]);
  });
});
