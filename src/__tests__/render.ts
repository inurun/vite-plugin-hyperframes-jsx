import type { HfNode } from "../jsx-runtime";
import { mountComposition } from "../mount";

// happy-dom has no FontFaceSet.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", { value: { ready: Promise.resolve() } });
}

let nextId = 0;

/** Creates a composition root in the document. */
export function createRoot(attributes: Record<string, string> = {}) {
  const root = document.createElement("div");
  const id = `test-${nextId++}`;
  const all = { fps: "30", width: "1920", height: "1080", duration: "10", ...attributes };
  root.setAttribute("data-composition-id", id);
  for (const [name, value] of Object.entries(all)) {
    root.setAttribute(`data-${name}`, value);
  }
  document.body.appendChild(root);
  return { root, id };
}

export async function render(tree: HfNode | (() => HfNode | Promise<HfNode>), attributes = {}) {
  const { root, id } = createRoot(attributes);
  const composition = await mountComposition(id, tree);
  const get = (testId: string) => {
    const el = root.querySelector(`[data-testid="${testId}"]`);
    if (!el) {
      throw new Error(`missing ${testId}`);
    }
    return el as HTMLElement;
  };
  return { ...composition, id, get };
}
