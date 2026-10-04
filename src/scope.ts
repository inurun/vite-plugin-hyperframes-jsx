export type Updater = (localFrame: number) => void;

export type ScopeNode = {
  /** Absolute start frame on the composition timeline. */
  from: number;
  durationInFrames: number;
  /** When set, children see `(frame - from) % loop` (a looping sequence). */
  loop: number | null;
  /** Descendants are evaluated at `frame - timeOffset` (fractional allowed). */
  timeOffset: number | ((localFrame: number) => number);
  wrapper: HTMLElement | SVGElement | null;
  display: string;
  updaters: Updater[];
  children: ScopeNode[];
  mounted: boolean | null;
};

export type VideoConfig = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
};

export type MountedCallback = () => unknown;

type BuildState = {
  config: VideoConfig;
  scope: ScopeNode;
  pending: Promise<unknown>[];
  mounted: MountedCallback[];
  afterMounted: MountedCallback[];
  contexts: Map<object, unknown[]>;
};

let state: BuildState | null = null;

export function getBuildState(): BuildState {
  if (!state) {
    throw new Error("HyperFrames build state is not initialised.");
  }
  return state;
}

export function setBuildState(next: BuildState | null) {
  state = next;
}

export function createScope(
  from: number,
  durationInFrames: number,
  wrapper: ScopeNode["wrapper"],
  display: string,
): ScopeNode {
  return {
    from,
    durationInFrames,
    loop: null,
    timeOffset: 0,
    wrapper,
    display,
    updaters: [],
    children: [],
    mounted: null,
  };
}

export function withScope<T>(scope: ScopeNode, fn: () => T): T {
  const build = getBuildState();
  const previous = build.scope;
  build.scope.children.push(scope);
  build.scope = scope;
  try {
    return fn();
  } finally {
    build.scope = previous;
  }
}

export function registerUpdater(updater: Updater) {
  getBuildState().scope.updaters.push(updater);
}

export function registerPending(promise: Promise<unknown>) {
  getBuildState().pending.push(promise);
}

/**
 * Runs once after the tree is mounted and fonts/images resolved, before the
 * clock registers. Callbacks run sequentially; returned promises are awaited.
 */
export function onMounted(callback: MountedCallback) {
  getBuildState().mounted.push(callback);
}

/**
 * Runs once after every `onMounted` callback finished (e.g. to build animations from sizes
 * measured there). Callbacks run in parallel; returned promises are awaited.
 */
export function afterMounted(callback: MountedCallback) {
  getBuildState().afterMounted.push(callback);
}

export function useVideoConfig(): VideoConfig {
  const { config, scope } = getBuildState();
  return {
    fps: config.fps,
    width: config.width,
    height: config.height,
    durationInFrames: scope.durationInFrames,
  };
}

/** The current scope's absolute start frame on the composition timeline and its duration. */
export function useSequenceTiming() {
  const { scope } = getBuildState();
  return { fromFrame: scope.from, durationInFrames: scope.durationInFrames };
}

function visit(node: ScopeNode, frame: number) {
  const local = frame - node.from;
  const mounted = local >= 0 && local < node.durationInFrames;
  if (node.mounted !== mounted) {
    if (node.wrapper) {
      node.wrapper.style.display = mounted ? node.display : "none";
    }
    node.mounted = mounted;
  }
  if (!mounted) {
    return;
  }
  const shifted =
    local - (typeof node.timeOffset === "function" ? node.timeOffset(local) : node.timeOffset);
  const inner = node.loop === null ? shifted : shifted % node.loop;
  for (const updater of node.updaters) {
    updater(inner);
  }
  for (const child of node.children) {
    visit(child, node.from + inner);
  }
}

export function renderFrame(root: ScopeNode, frame: number) {
  visit(root, frame);
}
