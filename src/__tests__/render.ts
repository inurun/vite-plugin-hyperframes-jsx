import { mountComposition } from "../mount";

// happy-dom has no FontFaceSet.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });
}

export async function render(tree: unknown, durationInFrames = 100) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const composition = await mountComposition(tree, container, {
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames,
  });
  const get = (id: string) => {
    const el = container.querySelector(`[data-testid="${id}"]`);
    if (!el) {
      throw new Error(`missing ${id}`);
    }
    return el as HTMLElement;
  };
  const visible = (id: string) => {
    for (let el: HTMLElement | null = get(id); el && el !== container; el = el.parentElement) {
      if (el.style.display === "none") {
        return false;
      }
    }
    return true;
  };
  return { container, get, visible, ...composition };
}
