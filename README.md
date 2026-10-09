# @inurun/vite-plugin-hyperframes-jsx

[![npm](https://img.shields.io/npm/v/@inurun/vite-plugin-hyperframes-jsx)](https://www.npmjs.com/package/@inurun/vite-plugin-hyperframes-jsx)
[![CI](https://github.com/inurun/vite-plugin-hyperframes-jsx/actions/workflows/ci.yml/badge.svg)](https://github.com/inurun/vite-plugin-hyperframes-jsx/actions/workflows/ci.yml)

Write [HyperFrames](https://github.com/heygen-com/hyperframes) compositions in JSX, bundled by Vite.

> Unofficial. This project is not affiliated with, endorsed by or maintained by HyperFrames or HeyGen.

- **Build-once JSX.** The JSX runtime creates real DOM nodes once. There is no virtual DOM, no re-rendering and no hooks: every component function runs exactly once, when the tree is mounted.
- **Frame values only in updaters.** Anything that depends on time is a pure function of the frame (`style={(frame) => ...}` on `<Frame>`, or `registerUpdater`). Seeking to any frame gives the same DOM, in any order, which is what HyperFrames needs to render deterministically.
- **GSAP only as the seekable clock.** `registerClock` registers one paused GSAP timeline with a single linear tween for HyperFrames to seek. Its `onUpdate` evaluates every updater at the current frame. Animation libraries are up to you.

The package ships a Vite plugin (sets the JSX import source) and a small runtime (`Clip`, `Loop`, `TimeShift`, `ClipSeries`, `Frame`, context, mounting and the clock).

## Install

```sh
pnpm add @inurun/vite-plugin-hyperframes-jsx gsap
```

Peer dependencies: `gsap` 3.12 or newer (the clock, shared with your own GSAP code) and `vite` 8 or newer (only for the plugin; the runtime works with any bundler that supports `jsxImportSource`).

## Vite config

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { hyperframesJsx } from "@inurun/vite-plugin-hyperframes-jsx";

export default defineConfig({
  base: "./", // HyperFrames loads the built files from the project directory
  plugins: [hyperframesJsx()],
});
```

The plugin sets Oxc's automatic JSX runtime with `importSource: "@inurun/vite-plugin-hyperframes-jsx"`, and excludes the package from dependency pre-bundling: a pre-bundled second copy would split the runtime's module state between the JSX runtime and the runtime API.

If the same project also compiles React (an admin UI next to the video, for example), scope the JSX runtime to the video files instead of the whole project:

```ts
hyperframesJsx({ include: "src/video/**", exclude: "**/*.react.tsx" });
```

With `include` or `exclude`, the plugin adds a `/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */` pragma to matching `.jsx` / `.tsx` files (unless they already have one) and leaves the project-wide JSX settings alone. You can also write the pragma yourself in each file.

## TypeScript

For type checking, either set it project-wide:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@inurun/vite-plugin-hyperframes-jsx",
  },
}
```

or write the pragma at the top of each video file (TypeScript then finds the `JSX` namespace in `@inurun/vite-plugin-hyperframes-jsx/jsx-runtime`). Intrinsic elements accept their HTML / SVG attributes, `data-*` and `aria-*`; `style` is typed with [csstype](https://github.com/frenic/csstype). Event handlers are not accepted: nothing in a rendered video is interactive.

## Example

The composition root lives in the HTML that HyperFrames renders:

```html
<!-- index.html -->
<div
  id="root"
  data-composition-id="main"
  data-width="1920"
  data-height="1080"
  data-fps="30"
  data-duration="5.333333"
></div>
<script type="module" src="./src/main.tsx"></script>
```

```tsx
// src/main.tsx
import {
  Fill,
  Frame,
  linear,
  mountComposition,
  registerClock,
  slide,
  ClipSeries,
  getVideoConfig,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";

function Title({ text }: { text: string }) {
  // Runs once. Read the config here; compute frame values in updaters.
  const { durationInFrames } = getVideoConfig();
  return (
    <Fill style={{ justifyContent: "center", alignItems: "center", background: "#111" }}>
      <Frame
        as="h1"
        style={(frame) => ({ color: "white", opacity: Math.min(1, frame / 15) })}
        text={(frame) => `${text} ${durationInFrames - frame}`}
      />
    </Fill>
  );
}

function Video() {
  return (
    <ClipSeries>
      <ClipSeries.Clip durationInFrames={90}>
        <Title text="Hello" />
      </ClipSeries.Clip>
      <ClipSeries.Transition
        timing={linear({ durationInFrames: 20 })}
        presentation={slide({ direction: "from-right" })}
      />
      <ClipSeries.Clip durationInFrames={90}>
        <Title text="World" />
      </ClipSeries.Clip>
    </ClipSeries>
  );
}

const stage = document.querySelector<HTMLElement>('[data-composition-id="main"]')!;
const config = { fps: 30, width: 1920, height: 1080, durationInFrames: 160 };
const composition = await mountComposition(<Video />, stage, config);
registerClock("main", composition);
```

`mountComposition` mounts the tree once and waits for image decodes, fonts and `onMounted` / `afterMounted` callbacks. `registerClock` then publishes the timeline on `window.__timelines[compositionId]` for HyperFrames to seek. Register it only after the mount resolved: HyperFrames treats a registered timeline as ready.

A complete project, with a script that renders it and checks the video, is in [`examples/basic`](examples/basic).

### Swapping the tree (new data, HMR)

Mount the next tree next to the current one, point the clock at it, then dispose the old one. The clock keeps its timeline and re-renders the current frame, so nothing flashes:

```tsx
import {
  mountComposition,
  registerClock,
  type Clock,
  type MountedComposition,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";

let clock: Clock | null = null;
let current: MountedComposition | null = null;

async function show(data: Data) {
  const next = await mountComposition(<Video data={data} />, stage, config);
  if (clock) {
    clock.setComposition(next); // same fps and durationInFrames
  } else {
    clock = registerClock("main", next);
  }
  current?.dispose();
  current = next;
}
```

`setComposition` needs the same `fps` and `durationInFrames`; for another length, call `clock.dispose()` and `registerClock` again (registering the same id also disposes the previous clock).

## API

`@inurun/vite-plugin-hyperframes-jsx`

- `hyperframesJsx({ include?, exclude? })`: the Vite plugin.

`@inurun/vite-plugin-hyperframes-jsx/runtime`

- Mounting: `mountComposition(tree, container, config)` → `{ config, renderFrame, dispose }`.
- Clock: `registerClock(compositionId, composition)` → `{ timeline, setComposition, requestRender, dispose }`; `requestRender()` re-renders the current frame of every clock (e.g. after async data arrived); `FRAME_EPSILON`.
- Timing: `Clip` (`from`, `durationInFrames`, `layout`), `Loop` (`durationInFrames`, `times`), `TimeShift` (`by`: a number or a function of the frame), `ClipSeries` with `.Clip` / `.Transition`, `linear({ durationInFrames, easing? })`, `slide({ direction? })`.
- Frame-dependent DOM: `Frame` (`as`, and `style`, `text`, `attrs` as functions of the scope-local frame), `registerUpdater(updater)`, `applyStyle`.
- Elements: `Fill`, `FILL`, `Img` (awaits `decode()` before the clock starts; warns when it fails).
- Build-time functions (call them in a component body; they run once, when the tree mounts): `getVideoConfig()`, `getClipTiming()`, `onMounted(callback)`, `afterMounted(callback)` (after every `onMounted`), `registerPending(promise)`, `measureElement()`, `createContext` / `readContext`.
- Low-level, for custom primitives: `defineMount(mountFn)` (a component that mounts its own DOM, as `Clip` and `Frame` do), `mount`, `mountHost`, `jsx`, `Fragment`. These may change between minor versions before 1.0.
- Types: `HfNode`, `HfElement`, `JSX`, `StyleObject`, `VideoConfig`, `Clock`, `MountedComposition`, `Updater`, `MountedCallback`, the props of every primitive (`ClipProps`, `LoopProps`, `TimeShiftProps`, `FrameProps`, `ImgProps`, `FillProps`, `ClipSeriesClipProps`, `ClipSeriesTransitionProps`), `HtmlProps`, `SvgProps`, `TransitionTiming`, `TransitionPresentation`, `SlideDirection`, `Size`, `Context`, `CustomMount`, `MountContext`.

`@inurun/vite-plugin-hyperframes-jsx/asset-url`

- `assetUrl(path)`: a public-dir asset URL relative to the composition HTML (works under `base: "./"`). A separate entry with no side effects and no DOM or GSAP, so server code can import it.

Easing and interpolation are not included: pass any `(t: number) => number` (for example from `d3-ease`) to `linear`, and bring your own animation library inside updaters.

Invalid input fails early with a descriptive error: a non-positive `fps` or size, a non-integer `durationInFrames`, a negative `Clip` duration, a `Loop` with a non-positive length or non-integer `times`, a `ClipSeries.Transition` that does not sit between two clips. Build-time functions called outside the mount (in an updater or an `onMounted` callback) say so.

## Compatibility

The runtime talks to HyperFrames through its documented composition contract: a paused GSAP timeline on `window.__timelines[compositionId]`, seeked with `timeline.seek(t, false)`, and `window.gsap` set to the GSAP instance that owns it. `examples/basic` is rendered with HyperFrames 0.8.137 in CI and its frames are checked.

## HyperFrames gotchas

- **Audio must be static.** HyperFrames render does not pick up `<audio>` elements created at runtime. Put audio clips in the composition HTML (a static manifest) instead of mounting them from JSX.
- **No `Date` subclasses.** HyperFrames render replaces `Date` with a virtual clock shim, which breaks subclasses such as `TZDate` from `@date-fns/tz`. Format dates with `Intl.DateTimeFormat` and a `timeZone` option.
- **Frame values belong in updaters.** Components run once, so reading time in a component body freezes it at mount. Use `Frame`, `registerUpdater` or a `TimeShift`.
- **`hyperframes lint` reports `missing_timeline_registry`.** The linter looks for `window.__timelines` in the HTML, but `registerClock` runs from the bundled script. The render is unaffected; use `--strict` only if you accept this finding.
- **The clock floors frames with `FRAME_EPSILON`.** HyperFrames seeks to exact frame times; tween rounding can leave the value slightly below an integer late in long videos. If you convert seconds to frames elsewhere (a preview player), use `Math.floor(seconds * fps + FRAME_EPSILON)` so both agree.

## Prior art

The component model is inspired by [Remotion](https://www.remotion.dev), which pioneered writing video as components with frame-based timing. If you know Remotion, these are the closest equivalents (the semantics differ: components here run once and frame values live in updaters, not in re-renders):

| Remotion                                              | This package                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `<Sequence>`                                          | `<Clip>`                                                            |
| `<TransitionSeries>` with `.Sequence` / `.Transition` | `<ClipSeries>` with `.Clip` / `.Transition`                         |
| `<AbsoluteFill>`                                      | `<Fill>`                                                            |
| `<Loop>`, `<Img>`, `slide()`                          | `<Loop>`, `<Img>`, `slide()`                                        |
| `linearTiming()`                                      | `linear()`                                                          |
| `useVideoConfig()`                                    | `getVideoConfig()`                                                  |
| `staticFile()`                                        | `assetUrl()`                                                        |
| `useCurrentFrame()`                                   | `<Frame style={(frame) => ...}>`, `registerUpdater((frame) => ...)` |

All code in this repository is independently implemented; it contains no code from Remotion and is not affiliated with it. The list of unitless CSS properties follows React's (MIT).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## License

MIT. GSAP, a peer dependency, is distributed under its own [Standard License](https://gsap.com/standard-license), not MIT.
