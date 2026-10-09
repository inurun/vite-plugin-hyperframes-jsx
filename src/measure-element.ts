import { onMounted } from "./scope";

export type Size = {
  width: number;
  height: number;
};

/** Layout size; 0 × 0 until the element has a real size. */
function measureBox(element: Element): Size {
  const { width, height } = element.getBoundingClientRect();
  const valid = Number.isFinite(width) && Number.isFinite(height) && width >= 1 && height >= 1;
  return valid ? { width, height } : { width: 0, height: 0 };
}

/**
 * Size of the `ref` element and of each element child, measured once after mounting (fonts
 * loaded). Read them only where they are resolved later: in an updater, or in an `onMounted`
 * callback registered after this one.
 */
export function measureElement() {
  const size: Size = { width: 0, height: 0 };
  const childSizes: Size[] = [];
  let node: HTMLElement | null = null;
  onMounted(() => {
    if (node) {
      Object.assign(size, measureBox(node));
      childSizes.push(...Array.from(node.children, (child) => measureBox(child)));
    }
  });
  return { ref: (element: HTMLElement | null) => (node = element), size, childSizes };
}
