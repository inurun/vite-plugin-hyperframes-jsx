/** Called with the scope-local frame on every rendered frame while its scope is visible. */
export type Updater = (localFrame: number) => void;

/** @internal The timing tree evaluated on every frame. */
export type ScopeNode = {
  /** Absolute start frame on the composition timeline. */
  from: number;
  durationInFrames: number;
  /** When set, children see `(frame - from) % loop` (a looping clip). */
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

/** Runs once after mounting; a returned promise is awaited. */
export type MountedCallback = () => unknown;

type BuildState = {
  config: VideoConfig;
  scope: ScopeNode;
  pending: Promise<unknown>[];
  mounted: MountedCallback[];
  afterMounted: MountedCallback[];
  contexts: Map<object, unknown[]>;
};

// Kept on globalThis so that two copies of this module (e.g. a pre-bundled one) share it.
const STATE_KEY = Symbol.for("hf.buildState");
const holder = globalThis as { [STATE_KEY]?: BuildState | null };

/** @internal */
export function getBuildState(caller = "This function"): BuildState {
  const state = holder[STATE_KEY];
  if (!state) {
    throw new Error(
      `${caller} can only be called while mountComposition() mounts the tree (in a component ` +
        "body), not in updaters or onMounted / afterMounted callbacks.",
    );
  }
  return state;
}

/** @internal */
export function setBuildState(next: BuildState | null) {
  holder[STATE_KEY] = next;
}

function isPositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

/** @internal Throws a descriptive error for an unusable video config. */
export function assertVideoConfig(config: VideoConfig) {
  const { fps, width, height, durationInFrames } = config;
  if (!isPositive(fps)) {
    throw new RangeError(`fps must be a positive number, got ${fps}.`);
  }
  if (!isPositive(width) || !isPositive(height)) {
    throw new RangeError(`width and height must be positive numbers, got ${width} × ${height}.`);
  }
  if (!Number.isInteger(durationInFrames) || durationInFrames <= 0) {
    throw new RangeError(`durationInFrames must be a positive integer, got ${durationInFrames}.`);
  }
}

/** @internal */
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

/** @internal */
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

/**
 * Registers a frame-pure function on the current scope. It is called with the scope-local
 * frame whenever the scope is visible; it must derive everything from that frame.
 */
export function registerUpdater(updater: Updater) {
  getBuildState("registerUpdater()").scope.updaters.push(updater);
}

/** Delays `mountComposition` (and so the clock) until `promise` settles. */
export function registerPending(promise: Promise<unknown>) {
  getBuildState("registerPending()").pending.push(promise);
}

/**
 * Runs once after the tree is mounted and fonts/images resolved, before the
 * clock registers. Callbacks run sequentially; returned promises are awaited.
 */
export function onMounted(callback: MountedCallback) {
  getBuildState("onMounted()").mounted.push(callback);
}

/**
 * Runs once after every `onMounted` callback finished (e.g. to build animations from sizes
 * measured there). Callbacks run in parallel; returned promises are awaited.
 */
export function afterMounted(callback: MountedCallback) {
  getBuildState("afterMounted()").afterMounted.push(callback);
}

/**
 * The video config, with `durationInFrames` of the enclosing `Clip` (or the loop length
 * inside a `Loop`).
 */
export function getVideoConfig(): VideoConfig {
  const { config, scope } = getBuildState("getVideoConfig()");
  return {
    fps: config.fps,
    width: config.width,
    height: config.height,
    durationInFrames: scope.durationInFrames,
  };
}

/** The current scope's absolute start frame on the composition timeline and its duration. */
export function getClipTiming(): { fromFrame: number; durationInFrames: number } {
  const { scope } = getBuildState("getClipTiming()");
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

/** @internal */
export function renderFrame(root: ScopeNode, frame: number) {
  visit(root, frame);
}
