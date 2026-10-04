// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { useElementSize } from "../element-size";
import { jsx } from "../jsx-runtime";
import { Frame } from "../primitives/frame";
import { render } from "./render";

describe("useElementSize", () => {
  it("measures the element and its children after mounting", async () => {
    // happy-dom has no layout: an element's height comes from its data-h attribute.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const height = Number(this.dataset["h"] ?? 0);
        return { width: 10, height } as DOMRect;
      },
    );
    const Reel = () => {
      const { ref, size, childSizes } = useElementSize();
      return jsx(Frame, {
        style: (frame: number) => ({ top: (size.height + childSizes[1]!.height) * (frame / 10) }),
        children: jsx("div", {
          ref,
          "data-h": 30,
          children: [jsx("div", { "data-h": 0 }), jsx("div", { "data-h": 12 })],
        }),
      });
    };
    const { container, renderFrame } = await render(jsx(Reel, {}), 10);
    renderFrame(5);
    expect((container.firstElementChild as HTMLElement).style.top).toBe("21px");
    vi.restoreAllMocks();
  });
});
