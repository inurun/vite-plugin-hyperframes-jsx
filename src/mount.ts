import { applyProps, HTML_NS, SVG_NS } from "./dom";
import { Fragment, type HfElement, type HfNode } from "./jsx-runtime";
import { getBuildState, setBuildState, type VideoConfig } from "./scope";

/** Where a custom-mount component appends its nodes, and the namespace to create them in. */
export type MountContext = { parent: Element; ns: string };

/** Mounts `props` into `ctx.parent`. Runs once, while the tree mounts. */
export type MountFn<P> = (props: P, ctx: MountContext) => void;

/** Components that take over mounting (such as `Clip`). */
export type CustomMount<P = Record<string, unknown>> = { $$hfMount: MountFn<P> };

type ProviderMarker = { $$hfProvider: object };

/**
 * Low-level: defines a component that mounts its own DOM (as `Clip` does) instead of
 * returning a tree. Typed as a function component so it is usable as a JSX
 * tag; never called directly.
 */
export function defineMount<P>(mountFn: MountFn<P>): ((props: P) => HfNode) & CustomMount<P> {
  const component = () => {
    throw new Error("Custom-mount components are mounted by the runtime.");
  };
  return Object.assign(component, { $$hfMount: mountFn });
}

function isElement(node: unknown): node is HfElement {
  return typeof node === "object" && node !== null && (node as HfElement).$$hf === true;
}

/** Low-level: mounts any node (element, text, array...) into `ctx.parent`. */
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

/** Low-level: creates the host element `type`, applies `props`, mounts children and the ref. */
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

/** @internal */
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
  /** The composition root (`[data-composition-id]`). */
  root: HTMLElement;
  config: VideoConfig;
  /**
   * Mounts `tree` next to this one, invisible until it is ready (same waits as
   * `mountComposition`), then shows it and disposes this one, so an update (new data, HMR)
   * never flashes blank or half-built. If the new tree fails, it is removed and this one
   * stays. Resolves to the new composition.
   */
  replace: (tree: CompositionTree) => Promise<MountedComposition>;
  /** Removes the mounted nodes from the root. */
  dispose: () => void;
};

/** A tree, or a function returning one (awaited first, e.g. to fetch data). */
export type CompositionTree = HfNode | (() => HfNode | Promise<HfNode>);

type HfWindow = {
  __hf?: { buildReady?: Record<string, PromiseLike<unknown>> };
  __timelines?: Record<string, unknown>;
};

function readNumber(root: HTMLElement, name: string, fallback?: number) {
  const raw = root.getAttribute(`data-${name}`);
  if (raw === null && fallback !== undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (raw === null || raw.trim() === "" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(
      `The composition root needs a positive data-${name} attribute, got ${JSON.stringify(raw)}.`,
    );
  }
  return value;
}

/** @internal Reads fps (default 30), size and duration (seconds) from the root's `data-*`. */
export function readVideoConfig(root: HTMLElement): VideoConfig {
  return {
    fps: readNumber(root, "fps", 30),
    width: readNumber(root, "width"),
    height: readNumber(root, "height"),
    duration: readNumber(root, "duration"),
  };
}

async function decodeImages(nodes: ChildNode[]) {
  const images = nodes.flatMap((node) =>
    node instanceof Element
      ? [...(node instanceof HTMLImageElement ? [node] : []), ...node.querySelectorAll("img")]
      : [],
  );
  await Promise.all(
    images.map((img) =>
      img.decode().catch((error: unknown) => {
        // The render goes on without the image; say which one so it is not a silent blank.
        console.warn(`[hyperframes-jsx] Could not decode image "${img.src}".`, error);
      }),
    ),
  );
}

/**
 * Mounts `tree` into the composition root `[data-composition-id="<compositionId>"]`, whose
 * `data-fps` / `data-width` / `data-height` / `data-duration` give the config. `tree` may be
 * a function, awaited first (e.g. to fetch data).
 *
 * HyperFrames waits (through `window.__hf.buildReady`) until the tree is mounted, images are
 * decoded, fonts are loaded, `registerPending` promises have settled and `onMounted`
 * callbacks have run; it then discovers and seeks the animations on the page (CSS, Web
 * Animations, GSAP...). Call it synchronously when the entry module runs, before any
 * `await`, so HyperFrames sees the hold on its first readiness check.
 */
export function mountComposition(
  compositionId: string,
  tree: CompositionTree,
): Promise<MountedComposition> {
  const root = document.querySelector<HTMLElement>(
    `[data-composition-id="${CSS.escape(compositionId)}"]`,
  );
  return hold(
    compositionId,
    root
      ? build(root, compositionId, tree, false)
      : Promise.reject(new Error(`No element with data-composition-id="${compositionId}".`)),
  );
}

/** Registers `ready` as the HyperFrames build hold of the composition. */
function hold(compositionId: string, ready: Promise<MountedComposition>) {
  const hfWindow = window as unknown as HfWindow;
  hfWindow.__hf ??= {};
  hfWindow.__hf.buildReady ??= {};
  hfWindow.__hf.buildReady[`hyperframes-jsx:${compositionId}`] = ready;
  return ready;
}

/** Hides elements with inline `opacity: 0` and returns a function restoring them. */
function hide(nodes: ChildNode[]) {
  const elements = nodes.filter(
    (node): node is HTMLElement | SVGElement =>
      node instanceof HTMLElement || node instanceof SVGElement,
  );
  const previous = elements.map((el) => [
    el.style.getPropertyValue("opacity"),
    el.style.getPropertyPriority("opacity"),
  ]);
  for (const el of elements) {
    el.style.setProperty("opacity", "0");
  }
  return () => {
    for (const [index, el] of elements.entries()) {
      const [value, priority] = previous[index]!;
      if (value) {
        el.style.setProperty("opacity", value, priority);
      } else {
        el.style.removeProperty("opacity");
      }
    }
  };
}

async function build(
  root: HTMLElement,
  compositionId: string,
  tree: CompositionTree,
  hidden: boolean,
): Promise<MountedComposition> {
  const config = readVideoConfig(root);
  const node = typeof tree === "function" ? await tree() : tree;
  const state = {
    config,
    clip: { start: 0, duration: config.duration, exactStart: 0 },
    pending: [] as Promise<unknown>[],
    mounted: [] as (() => unknown)[],
    contexts: new Map<object, unknown[]>(),
  };
  const before = root.lastChild;
  const nodes: ChildNode[] = [];
  const dispose = () => {
    for (const child of nodes) {
      child.remove();
    }
  };
  let show = () => {};
  try {
    setBuildState(state);
    try {
      mount(node, { parent: root, ns: HTML_NS });
    } finally {
      setBuildState(null);
      for (let child = before ? before.nextSibling : root.firstChild; child; ) {
        nodes.push(child);
        child = child.nextSibling;
      }
    }
    if (hidden) {
      show = hide(nodes);
    }
    await Promise.all([...state.pending, decodeImages(nodes), document.fonts.ready]);
    for (const callback of state.mounted) {
      await callback();
    }
  } catch (error) {
    dispose();
    throw error;
  }
  // Without a registered timeline (CSS / Web Animations only), HyperFrames would wait for one.
  if (!(window as unknown as HfWindow).__timelines?.[compositionId]) {
    root.setAttribute("data-no-timeline", "");
  }
  show();
  const composition: MountedComposition = {
    root,
    config,
    replace: (next) =>
      hold(
        compositionId,
        build(root, compositionId, next, true).then((replaced) => {
          composition.dispose();
          return replaced;
        }),
      ),
    dispose,
  };
  return composition;
}
