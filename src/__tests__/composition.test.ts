// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsx } from "../jsx-runtime";
import { mountComposition } from "../mount";
import { getVideoConfig, onMounted, registerPending } from "../scope";
import { createRoot, render } from "./render";

type HfWindow = {
  __hf?: { buildReady?: Record<string, Promise<unknown>> };
  __timelines?: Record<string, unknown>;
};
const hfWindow = window as unknown as HfWindow;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mountComposition", () => {
  it("registers the HyperFrames build hold synchronously", async () => {
    const { id } = createRoot();
    const mounted = mountComposition(id, async () => jsx("p", {}));
    expect(hfWindow.__hf?.buildReady?.[`hyperframes-jsx:${id}`]).toBe(mounted);
    await mounted;
  });

  it("reads the config from the root, fps defaulting to 30", async () => {
    const { root, id } = createRoot({ fps: "", width: "1280", height: "720", duration: "4.5" });
    root.removeAttribute("data-fps");
    let config: unknown;
    const Probe = () => {
      config = getVideoConfig();
      return null;
    };
    await mountComposition(id, jsx(Probe, {}));
    expect(config).toEqual({ fps: 30, width: 1280, height: 720, duration: 4.5 });
  });

  it.each([
    [{ width: "0" }, /data-width/],
    [{ height: "abc" }, /data-height/],
    [{ duration: "" }, /data-duration/],
  ])("rejects a root with %o", async (attributes, message) => {
    await expect(render(null, attributes)).rejects.toThrow(message);
  });

  it("rejects an unknown composition id", async () => {
    await expect(mountComposition("missing", null)).rejects.toThrow(
      /data-composition-id="missing"/,
    );
  });

  it("awaits the tree function, pending promises and onMounted callbacks in order", async () => {
    const order: string[] = [];
    let release!: () => void;
    const pending = new Promise<void>((resolve) => (release = resolve)).then(() =>
      order.push("pending"),
    );
    const Probe = () => {
      registerPending(pending);
      onMounted(async () => {
        order.push("mounted 1");
      });
      onMounted(() => order.push("mounted 2"));
      return jsx("p", { "data-testid": "p" });
    };
    const mounted = render(async () => {
      order.push("tree");
      return jsx(Probe, {});
    });
    await Promise.resolve();
    release();
    const { get } = await mounted;
    expect(get("p").tagName).toBe("P");
    expect(order).toEqual(["tree", "pending", "mounted 1", "mounted 2"]);
  });

  it("marks the root data-no-timeline unless a timeline was registered", async () => {
    const plain = await render(jsx("p", {}));
    expect(plain.root.hasAttribute("data-no-timeline")).toBe(true);

    const { root, id } = createRoot();
    const Gsapish = () => {
      onMounted(() => {
        hfWindow.__timelines = { ...hfWindow.__timelines, [id]: {} };
      });
      return null;
    };
    await mountComposition(id, jsx(Gsapish, {}));
    expect(root.hasAttribute("data-no-timeline")).toBe(false);
  });

  it("waits for images and warns about one that cannot be decoded", async () => {
    vi.spyOn(HTMLImageElement.prototype, "decode").mockRejectedValue(new Error("broken"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { root } = await render(jsx("div", { children: jsx("img", { src: "missing.png" }) }));
    expect(root.querySelector("img")?.getAttribute("src")).toBe("missing.png");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing.png"), expect.any(Error));
  });

  it("removes only its own nodes on dispose", async () => {
    const { root, id } = createRoot();
    root.append(document.createElement("header"));
    const composition = await mountComposition(id, [jsx("p", {}), jsx("p", {})]);
    expect(root.children).toHaveLength(3);
    composition.dispose();
    expect(root.innerHTML).toBe("<header></header>");
  });

  it("removes the partly mounted tree when mounting fails", async () => {
    const Broken = () => {
      throw new Error("broken");
    };
    const { root, id } = createRoot();
    await expect(mountComposition(id, [jsx("p", {}), jsx(Broken, {})])).rejects.toThrow("broken");
    expect(root.children).toHaveLength(0);
  });

  it("replaces the tree once the new one is ready, hidden until then", async () => {
    const { root, id } = createRoot();
    const first = await mountComposition(id, jsx("p", { "data-testid": "old" }));
    let release!: () => void;
    let opacityWhileMounting: string | undefined;
    const Next = () => {
      registerPending(new Promise<void>((resolve) => (release = resolve)));
      onMounted(() => {
        opacityWhileMounting =
          root.querySelector<HTMLElement>('[data-testid="new"]')?.style.opacity;
      });
      return jsx("p", { "data-testid": "new", style: { opacity: 0.5 } });
    };
    const replacing = first.replace(jsx(Next, {}));
    expect(hfWindow.__hf?.buildReady?.[`hyperframes-jsx:${id}`]).toBe(replacing);
    await Promise.resolve();
    expect(root.querySelector('[data-testid="old"]')).not.toBeNull();
    release();
    const second = await replacing;
    expect(opacityWhileMounting).toBe("0");
    expect(root.querySelector('[data-testid="old"]')).toBeNull();
    expect(root.querySelector<HTMLElement>('[data-testid="new"]')?.style.opacity).toBe("0.5");
    second.dispose();
    expect(root.children).toHaveLength(0);
  });

  it("keeps the current tree when the replacement fails", async () => {
    const { root, id } = createRoot();
    const first = await mountComposition(id, jsx("p", { "data-testid": "old" }));
    const Broken = () => {
      onMounted(() => {
        throw new Error("broken");
      });
      return jsx("p", { "data-testid": "new" });
    };
    await expect(first.replace(jsx(Broken, {}))).rejects.toThrow("broken");
    expect(root.querySelector('[data-testid="old"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="new"]')).toBeNull();
  });

  it("explains that build-time functions cannot run later", async () => {
    const Probe = () => {
      onMounted(() => getVideoConfig());
      return null;
    };
    await expect(render(jsx(Probe, {}))).rejects.toThrow(
      /getVideoConfig\(\) can only be called while mountComposition\(\) mounts the tree/,
    );
  });
});
