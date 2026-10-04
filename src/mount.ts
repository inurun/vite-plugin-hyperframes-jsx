import { applyProps, HTML_NS, SVG_NS } from "./dom";
import { Fragment, type HfElement, type HfNode } from "./jsx-runtime";
import {
  createScope,
  getBuildState,
  renderFrame,
  setBuildState,
  type ScopeNode,
  type VideoConfig,
} from "./scope";

export type MountContext = { parent: Element; ns: string };

type MountFn<P> = (props: P, ctx: MountContext) => void;

/** Components that take over mounting (Sequence, Frame, Img...). */
export type CustomMount<P = Record<string, unknown>> = { $$hfMount: MountFn<P> };

export type ProviderMarker = { $$hfProvider: object };

/** Typed as a function component so it is usable as a JSX tag; never called directly. */
export function defineMount<P>(mountFn: MountFn<P>): ((props: P) => HfNode) & CustomMount<P> {
  const component = () => {
    throw new Error("Custom-mount components are mounted by the runtime.");
  };
  return Object.assign(component, { $$hfMount: mountFn });
}

function isElement(node: unknown): node is HfElement {
  return typeof node === "object" && node !== null && (node as HfElement).$$hf === true;
}

export function mount(node: unknown, ctx: MountContext): void {
  if (node == null || typeof node === "boolean") {
    return;
  }
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    ctx.parent.appendChild(document.createTextNode(String(node)));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      mount(child, ctx);
    }
    return;
  }
  if (!isElement(node)) {
    throw new Error(`Unsupported node: ${String(node)}`);
  }

  const { type, props } = node;

  if (type === Fragment) {
    mount(props["children"], ctx);
    return;
  }

  if (typeof type === "string") {
    mountHost(type, props, ctx);
    return;
  }

  if (typeof type === "function" || typeof type === "object") {
    const custom = (type as Partial<CustomMount>).$$hfMount;
    if (custom) {
      custom(props, ctx);
      return;
    }
    const provider = (type as Partial<ProviderMarker>).$$hfProvider;
    if (provider) {
      const stack = getContextStack(provider);
      stack.push(props["value"]);
      try {
        mount(props["children"], ctx);
      } finally {
        stack.pop();
      }
      return;
    }
    mount((type as (p: Record<string, unknown>) => unknown)(props), ctx);
    return;
  }

  throw new Error(`Unsupported element type: ${String(type)}`);
}

export function mountHost(
  type: string,
  props: Record<string, unknown>,
  ctx: MountContext,
): Element {
  const isSvg = ctx.ns === SVG_NS || type === "svg";
  const el = isSvg ? document.createElementNS(SVG_NS, type) : document.createElement(type);
  applyProps(el, props, isSvg);
  mount(props["children"], {
    parent: el,
    ns: type === "foreignObject" ? HTML_NS : isSvg ? SVG_NS : HTML_NS,
  });
  ctx.parent.appendChild(el);
  const ref = props["ref"];
  if (typeof ref === "function") {
    ref(el);
  } else if (ref && typeof ref === "object") {
    (ref as { current: unknown }).current = el;
  }
  return el;
}

export function getContextStack(context: object): unknown[] {
  const contexts = getBuildState().contexts;
  let stack = contexts.get(context);
  if (!stack) {
    stack = [];
    contexts.set(context, stack);
  }
  return stack;
}

export type MountedComposition = {
  root: ScopeNode;
  renderFrame: (frame: number) => void;
};

/**
 * Mounts the tree once. Pending promises (image decodes...), fonts and
 * `onMounted` callbacks are awaited before resolving so the caller can
 * register the HF timeline.
 */
export async function mountComposition(
  tree: unknown,
  container: HTMLElement,
  config: VideoConfig,
): Promise<MountedComposition> {
  const root = createScope(0, config.durationInFrames, null, "");
  const state = {
    config,
    scope: root,
    pending: [] as Promise<unknown>[],
    mounted: [] as (() => unknown)[],
    contexts: new Map<object, unknown[]>(),
  };
  setBuildState(state);
  try {
    mount(tree, { parent: container, ns: HTML_NS });
  } finally {
    setBuildState(null);
  }
  await Promise.all([...state.pending, document.fonts.ready]);
  for (const callback of state.mounted) {
    await callback();
  }
  return { root, renderFrame: (frame) => renderFrame(root, frame) };
}
