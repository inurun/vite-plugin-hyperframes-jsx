/** The composition settings, read from the `data-*` attributes of its root element. */
export type VideoConfig = {
  fps: number;
  width: number;
  height: number;
  /** In seconds. */
  duration: number;
};

/** Where the enclosing `Clip` sits on the composition timeline, in seconds. */
export type ClipTiming = {
  /** Absolute start time. */
  start: number;
  duration: number;
};

/** Runs once after mounting; a returned promise is awaited. */
export type MountedCallback = () => unknown;

/** @internal The enclosing clip, plus its start before snapping to frames. */
export type ClipScope = ClipTiming & { exactStart: number };

type BuildState = {
  config: VideoConfig;
  clip: ClipScope;
  pending: Promise<unknown>[];
  mounted: MountedCallback[];
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
        "body), not in onMounted callbacks, ref callbacks or later.",
    );
  }
  return state;
}

/** @internal */
export function setBuildState(next: BuildState | null) {
  holder[STATE_KEY] = next;
}

/** @internal Runs `fn` with `clip` as the enclosing clip. */
export function withClip<T>(clip: ClipScope, fn: () => T): T {
  const build = getBuildState();
  const previous = build.clip;
  build.clip = clip;
  try {
    return fn();
  } finally {
    build.clip = previous;
  }
}

/** Delays the end of `mountComposition` (and so the render) until `promise` settles. */
export function registerPending(promise: Promise<unknown>) {
  getBuildState("registerPending()").pending.push(promise);
}

/**
 * Runs once after the tree is mounted, images decoded, fonts loaded and pending promises
 * settled, before HyperFrames starts rendering: the place to measure layout or build
 * animations (e.g. a GSAP timeline registered on `window.__timelines`). Callbacks run
 * sequentially in registration order; returned promises are awaited.
 */
export function onMounted(callback: MountedCallback) {
  getBuildState("onMounted()").mounted.push(callback);
}

/** The composition settings (fps, size, duration in seconds). */
export function getVideoConfig(): VideoConfig {
  return { ...getBuildState("getVideoConfig()").config };
}

/**
 * The absolute start and the duration of the enclosing `Clip`, in seconds (the whole
 * composition outside any clip). Useful for animations timed on the composition clock,
 * such as a Web Animations API `delay`.
 */
export function getClipTiming(): ClipTiming {
  const { start, duration } = getBuildState("getClipTiming()").clip;
  return { start, duration };
}
