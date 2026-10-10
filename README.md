# @inurun/vite-plugin-hyperframes-jsx

[![npm](https://img.shields.io/npm/v/@inurun/vite-plugin-hyperframes-jsx)](https://www.npmjs.com/package/@inurun/vite-plugin-hyperframes-jsx)
[![CI](https://github.com/inurun/vite-plugin-hyperframes-jsx/actions/workflows/ci.yml/badge.svg)](https://github.com/inurun/vite-plugin-hyperframes-jsx/actions/workflows/ci.yml)

Write [HyperFrames](https://github.com/heygen-com/hyperframes) compositions in JSX, bundled by Vite.

> Unofficial. This project is not affiliated with, endorsed by or maintained by HyperFrames or HeyGen.

- **Build-once JSX.** The JSX runtime creates real DOM nodes once. There is no virtual DOM and no re-rendering: every component function runs exactly once, when the tree is mounted.
- **HyperFrames does the rest.** `<Clip>` becomes a HyperFrames clip (`data-start` / `data-duration`), which HyperFrames shows and hides. Animations are whatever HyperFrames can seek: CSS animations, the Web Animations API, GSAP, Lottie, Three.js... This package does not ship a timeline or an animation library.
- **Async-safe mounting.** HyperFrames waits until the tree is mounted, images are decoded, fonts are loaded and your setup code has run, so data can be fetched before the first frame.

## Install

```sh
pnpm add @inurun/vite-plugin-hyperframes-jsx
```

`vite` 8 or newer is an optional peer dependency (only the plugin needs it; the runtime works with any bundler that supports `jsxImportSource`).

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

The plugin sets Oxc's automatic JSX runtime with `importSource: "@inurun/vite-plugin-hyperframes-jsx"`, and excludes the package from dependency pre-bundling: a pre-bundled second copy would split the runtime's module state.

If the same project also compiles React (an admin UI next to the video, for example), scope the JSX runtime to the video files:

```ts
hyperframesJsx({ include: "src/video/**", exclude: "**/*.react.tsx" });
```

With `include` or `exclude`, the plugin adds a `/** @jsxImportSource @inurun/vite-plugin-hyperframes-jsx */` pragma to matching `.jsx` / `.tsx` files (unless they already have one) and leaves the project-wide JSX settings alone. You can also write the pragma yourself in each file.

## TypeScript

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@inurun/vite-plugin-hyperframes-jsx",
  },
}
```

Or write the pragma at the top of each video file. Intrinsic elements accept their HTML / SVG attributes, `data-*` and `aria-*`; `style` is typed with [csstype](https://github.com/frenic/csstype). Event handlers are not accepted: nothing in a rendered video is interactive.

## Example

The composition root lives in the HTML that HyperFrames renders. Its `data-*` attributes are the config: size, fps (default 30) and duration in seconds.

```html
<!-- index.html -->
<div
  id="root"
  data-composition-id="main"
  data-width="1920"
  data-height="1080"
  data-fps="30"
  data-duration="6"
  data-no-timeline
></div>
<script type="module" src="./src/main.tsx"></script>
```

```tsx
// src/main.tsx
import "./styles.css";
import { Clip, mountComposition } from "@inurun/vite-plugin-hyperframes-jsx/runtime";

function Title({ text }: { text: string }) {
  return (
    <div className="scene">
      <h1 className="fade-in">{text}</h1>
    </div>
  );
}

// Synchronously, before any await: HyperFrames waits for the mount from its first check.
mountComposition("main", async () => {
  const titles: string[] = await (await fetch("./titles.json")).json();
  return titles.map((text, index) => (
    <Clip start={index * 2} duration={2}>
      <Title text={text} />
    </Clip>
  ));
});
```

```css
/* src/styles.css: CSS animations start when their clip starts */
.fade-in {
  animation: fade-in 0.5s ease-out both;
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}
```

A complete project, rendered and checked in CI, is in [`examples/basic`](examples/basic).

## Clips

```tsx
<Clip start={1.5} duration={3} className="scene" style={{ background: "#111" }}>
  ...
</Clip>
```

- `start` and `duration` are in **seconds**. `start` is relative to the enclosing clip (default 0); `duration` defaults to the rest of the enclosing clip and is clamped to it. A zero-length clip, or one entirely outside its parent, is not mounted (data-driven durations can be 0).
- It renders a `div class="clip"` with absolute `data-start` / `data-duration`, `position: absolute; inset: 0` (override with `style`). HyperFrames shows and hides it.
- Both ends snap to the frame grid, so clips that meet in seconds meet on the same frame. A nested clip snaps its own absolute time (the parent's exact start plus its `start`), so it lands on the same frame as anything else placed at that absolute time, such as audio in the HTML.
- Overlapping clips are fine: a transition is two overlapping clips whose contents animate.

## Animations

Use any runtime HyperFrames supports; it discovers the animations once the mount is done and seeks them for every frame.

**CSS animations** run on the clip's clock: `0s` is when the enclosing `<Clip>` starts.

**Web Animations** run on the composition clock. Use `getClipTiming()` for the absolute start:

```tsx
function SlideOut() {
  const { start, duration } = getClipTiming(); // seconds
  return (
    <div
      ref={(el) =>
        el.animate([{ transform: "translateX(0)" }, { transform: "translateX(-100%)" }], {
          delay: (start + duration - 0.5) * 1000,
          duration: 500,
          fill: "both",
        })
      }
    />
  );
}
```

**GSAP**, as HyperFrames documents it: build one paused timeline and register it under the composition id, here in `onMounted` (the DOM is ready and laid out). Leave `data-no-timeline` off the root.

```tsx
function Intro() {
  onMounted(() => {
    const tl = gsap.timeline({ paused: true });
    tl.from(".intro h1", { opacity: 0, y: 40, duration: 0.5 }, 0.2);
    window.__timelines["main"] = tl;
  });
  return (
    <Clip duration={3} className="intro">
      <h1>Hello</h1>
    </Clip>
  );
}
```

Animate elements **inside** a clip, not the clip element itself: HyperFrames owns its visibility.

## Mounting

`mountComposition(compositionId, tree)` mounts `tree` (or the result of an async function) into `[data-composition-id="<compositionId>"]` and resolves to `{ root, config, replace, dispose }`. If mounting fails, the partly mounted nodes are removed.

It registers a hold on `window.__hf.buildReady` synchronously, so call it when the entry module runs, before any `await`. HyperFrames starts rendering once the tree is mounted, images are decoded (a failure is logged and the render goes on), fonts are loaded, `registerPending` promises have settled and `onMounted` callbacks have run. If no timeline was registered under the composition id by then, the root gets `data-no-timeline` so HyperFrames does not wait for one; write it in the HTML too, which also keeps `hyperframes lint` quiet.

### Replacing the tree

To show new data (a preview editor sending updates) or a hot-reloaded module, call `replace` on the current composition:

```tsx
let current = await mountComposition("main", <Video data={initial} />);

async function update(data: Data) {
  current = await current.replace(<Video data={data} />);
}
```

The new tree mounts next to the current one with `opacity: 0` on its top-level elements, goes through the same waits, then is shown while the current one is disposed, so the update never flashes. If it fails, it is removed and the current tree stays. Serialize updates (one `replace` at a time).

## API

`@inurun/vite-plugin-hyperframes-jsx`

- `hyperframesJsx({ include?, exclude? })`: the Vite plugin.

`@inurun/vite-plugin-hyperframes-jsx/runtime`

- `mountComposition(compositionId, tree)` → `Promise<{ root, config, replace(tree), dispose() }>`.
- `Clip` (`start`, `duration`, plus `div` props).
- Build-time functions, called in a component body while the tree mounts: `getVideoConfig()` (`{ fps, width, height, duration }`), `getClipTiming()` (`{ start, duration }` of the enclosing clip, absolute seconds), `onMounted(callback)`, `registerPending(promise)`, `createContext(default)` / `readContext(context)` (with `<Context.Provider value>`). Called later (in a callback), they throw and say so.
- Low-level, for custom components that create their own DOM: `defineMount(mountFn)`, `mount`, `mountHost`, `jsx`, `Fragment`. These may change between minor versions before 1.0.
- Types: `HfNode`, `HfElement`, `JSX`, `StyleObject`, `VideoConfig`, `ClipTiming`, `ClipProps`, `MountedComposition`, `CompositionTree`, `MountedCallback`, `HtmlProps`, `SvgProps`, `SvgAttributes`, `BaseProps`, `Ref`, `Context`, `CustomMount`, `MountContext`, `MountFn`.

## Compatibility

The runtime relies on these parts of the HyperFrames contract: `data-start` / `data-duration` clips, `window.__hf.buildReady`, `data-no-timeline`, and the runtime adapters that seek CSS, Web Animations and GSAP. `examples/basic` is rendered with HyperFrames 0.8.137 in CI and its frames are checked.

## HyperFrames gotchas

- **Audio must be static.** HyperFrames render does not pick up `<audio>` elements created at runtime. Put audio clips in the composition HTML (a static manifest) instead of mounting them from JSX.
- **No `Date` subclasses.** HyperFrames render replaces `Date` with a virtual clock shim, which breaks subclasses such as `TZDate` from `@date-fns/tz`. Format dates with `Intl.DateTimeFormat` and a `timeZone` option.
- **Don't animate the clip element.** Tweening `display`, `visibility` or `autoAlpha` on a clip races with HyperFrames; animate a child.

## Roadmap

- **Studio and `hyperframes timeline` support.** Clips created by JSX exist only at runtime, while Studio and `hyperframes timeline` read the composition HTML, so these clips do not appear there (rendering is unaffected). The plan is to expose them to that tooling, for example by emitting the clips into the built HTML.
- **Preview and live updates.** `replace` works in HyperFrames' preview player when animations live on a GSAP timeline re-registered with each mount (HyperFrames rebinds it after runtime data is applied). Whether HyperFrames rediscovers CSS and Web Animations after a replacement is still to be checked.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## License

MIT. Style handling follows React's conventions (unitless properties, camelCase names).
