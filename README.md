# vite-plugin-hyperframes-jsx

Write [HyperFrames](https://www.npmjs.com/package/hyperframes) compositions in JSX, bundled by Vite.

> Unofficial. This project is not affiliated with, endorsed by or maintained by HyperFrames or HeyGen.

- **Build-once JSX.** The JSX runtime creates real DOM nodes once. There is no virtual DOM, no re-rendering and no hooks: every component function runs exactly once, when the tree is mounted.
- **Frame values only in updaters.** Anything that depends on time is a pure function of the frame (`style={(frame) => ...}` on `<Frame>`, or `registerUpdater`). Seeking to any frame gives the same DOM, in any order, which is what HyperFrames needs to render deterministically.
- **GSAP only as the seekable clock.** `registerClock` registers one paused GSAP timeline with a single linear tween for HyperFrames to seek. Its `onUpdate` evaluates every updater at the current frame. Animation libraries are up to you.

The package ships a Vite plugin (sets the JSX import source) and a small runtime (`Sequence`, `Loop`, `TimeShift`, `TransitionSeries`, `Frame`, context, mounting and the clock).

## Install

```sh
pnpm add vite-plugin-hyperframes-jsx
```

Vite 8 or newer is a peer dependency. `gsap` is installed as a dependency.

## Vite config

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { hyperframes } from "vite-plugin-hyperframes-jsx";

export default defineConfig({
  plugins: [hyperframes()],
});
```

The plugin sets Oxc's automatic JSX runtime with `importSource: "vite-plugin-hyperframes-jsx"`, and excludes the package from dependency pre-bundling: a pre-bundled second copy would split the runtime's module state between the JSX runtime and the runtime API.

Options (all optional):

- `html`: `{ compositionId, durationSec, fps, width, height }` fills `%HF_COMPOSITION_ID%`, `%HF_DURATION%`, `%HF_FPS%`, `%HF_WIDTH%` and `%HF_HEIGHT%` in a static `index.html`.
- `publicLinks`: `{ dir, names }` symlinks `<dir>/<name>` into the build output instead of copying large assets.

## JSX pragma and TypeScript

If the same project also compiles React (an admin UI next to the video, for example), set the import source per file:

```tsx
/** @jsxImportSource vite-plugin-hyperframes-jsx */
```

TypeScript then finds the `JSX` namespace in `vite-plugin-hyperframes-jsx/jsx-runtime`. A video-only project can instead set `"jsx": "react-jsx"` and `"jsxImportSource": "vite-plugin-hyperframes-jsx"` in `tsconfig.json`.

## Example

```tsx
/** @jsxImportSource vite-plugin-hyperframes-jsx */
import {
  AbsoluteFill,
  Frame,
  linearTiming,
  mountComposition,
  registerClock,
  slide,
  TransitionSeries,
  useVideoConfig,
} from "vite-plugin-hyperframes-jsx/runtime";

function Title({ text }: { text: string }) {
  // Runs once. Read the config here; compute frame values in updaters.
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "#111" }}>
      <Frame
        as="h1"
        style={(frame) => ({ color: "white", opacity: Math.min(1, frame / 15) })}
        text={(frame) => `${text} ${durationInFrames - frame}`}
      />
    </AbsoluteFill>
  );
}

function Video() {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={90}>
        <Title text="Hello" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        timing={linearTiming({ durationInFrames: 20 })}
        presentation={slide({ direction: "from-right" })}
      />
      <TransitionSeries.Sequence durationInFrames={90}>
        <Title text="World" />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
}

const stage = document.querySelector<HTMLElement>('[data-composition-id="main"]')!;
const config = { fps: 30, width: 1920, height: 1080, durationInFrames: 160 };
const composition = await mountComposition(<Video />, stage, config);
registerClock("main", composition, config.fps, config.durationInFrames);
```

`mountComposition` mounts the tree once and waits for image decodes, fonts and `onMounted` callbacks. `registerClock` then publishes the timeline on `window.__timelines[compositionId]` for HyperFrames to seek.

## API

`vite-plugin-hyperframes-jsx`

- `hyperframes(options?)`: the Vite plugin.

`vite-plugin-hyperframes-jsx/runtime`

- Mounting: `mountComposition(tree, container, config)`, `mount`, `mountHost`, `defineMount` (custom-mount components), `jsx`, `Fragment`.
- Clock: `registerClock(compositionId, composition, fps, durationInFrames)`, `requestRender()` (re-render the current frame after async data arrives), `FRAME_EPSILON`.
- Timing: `Sequence` (`from`, `durationInFrames`, `layout`), `Loop` (`durationInFrames`, `times`), `TimeShift` (`by`: a number or a function of the frame), `TransitionSeries` with `.Sequence` / `.Transition`, `linearTiming({ durationInFrames, easing? })`, `slide({ direction? })`.
- Frame-dependent DOM: `Frame` (`style`, `text`, `attrs` as functions of the scope-local frame), `registerUpdater(updater)`, `applyStyle`.
- Elements: `AbsoluteFill`, `ABSOLUTE_FILL`, `Img` (awaits `decode()` before the clock starts).
- Build-time hooks: `useVideoConfig()`, `useSequenceTiming()`, `onMounted(callback)`, `registerPending(promise)`, `useElementSize()`, `createContext` / `useContext`.
- Types: `HfNode`, `HfElement`, `JSX`, `StyleObject`, `VideoConfig`, `Clock`, `MountedComposition`, `MountContext`, `SequenceProps`, `TransitionTiming`, `TransitionPresentation`, `SlideDirection`, `Size`, `Context`.

`vite-plugin-hyperframes-jsx/static-file`

- `staticFile(path)`: a public-dir asset URL relative to the composition HTML (works under `base: "./"`). A separate entry with no side effects and no DOM or GSAP, so server code can import it.

Easing and interpolation are not included: pass any `(t: number) => number` (for example from `d3-ease`) to `linearTiming`, and bring your own animation library inside updaters.

## HyperFrames gotchas

- **Audio must be static.** HyperFrames render does not pick up `<audio>` elements created at runtime. Put audio clips in the composition HTML (a static manifest) instead of mounting them from JSX.
- **No `Date` subclasses.** HyperFrames render replaces `Date` with a virtual clock shim, which breaks subclasses such as `TZDate` from `@date-fns/tz`. Format dates with `Intl.DateTimeFormat` and a `timeZone` option.
- **Frame values belong in updaters.** Components run once, so reading time in a component body freezes it at mount. Use `Frame`, `registerUpdater` or a `TimeShift`.
- **The clock floors frames with `FRAME_EPSILON`.** HyperFrames seeks to exact frame times; tween rounding can leave the value slightly below an integer late in long videos. If you convert seconds to frames elsewhere (a preview player), use `Math.floor(seconds * fps + FRAME_EPSILON)` so both agree.

## License

MIT
