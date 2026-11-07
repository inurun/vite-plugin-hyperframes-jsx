# Changelog

All notable changes to this package are listed here. The project follows [Semantic Versioning](https://semver.org/); before 1.0, breaking changes bump the minor version.

## [0.3.0](https://github.com/inurun/vite-plugin-hyperframes-jsx/compare/v0.2.4...v0.3.0) (2026-11-07)


### ⚠ BREAKING CHANGES

* Node.js 20 is no longer supported. The package now requires Node.js 22.12 or newer.

### Features

* require Node.js 26 or newer ([#12](https://github.com/inurun/vite-plugin-hyperframes-jsx/issues/12)) ([3d5d5ed](https://github.com/inurun/vite-plugin-hyperframes-jsx/commit/3d5d5edef475755474bbd09b9263e1b77d64c83c))


### Compatibility

* checked with HyperFrames 0.9.19 ([b496df3](https://github.com/inurun/vite-plugin-hyperframes-jsx/commit/b496df323d61d46e70ac4d09084432fcb656c568))
* checked with HyperFrames 0.9.19 ([#9](https://github.com/inurun/vite-plugin-hyperframes-jsx/issues/9)) ([72cc622](https://github.com/inurun/vite-plugin-hyperframes-jsx/commit/72cc622ccba97c53c112e2354adc536ecdb0833c))

## [0.2.4](https://github.com/inurun/vite-plugin-hyperframes-jsx/compare/v0.2.3...v0.2.4) (2026-11-03)


### Bug Fixes

* find the composition root without a template-literal selector ([fe6a9de](https://github.com/inurun/vite-plugin-hyperframes-jsx/commit/fe6a9ded6dd1859cb33c18b6d8a184dc39e79672))


### Compatibility

* checked with HyperFrames 0.9.7 ([ebae698](https://github.com/inurun/vite-plugin-hyperframes-jsx/commit/ebae6987a9efc0a6829318a776887ed8e78aba5a))

## 0.2.3 - 2026-10-11

The runtime is unchanged.

### Changed

- Checked with HyperFrames 0.8.146 (`examples/basic` is rendered with it in CI).
- First release published from CI with npm trusted publishing and provenance.

## 0.2.2 - 2026-10-11

First release on npm. The runtime is unchanged from 0.2.1.

### Changed

- README: don't assign `window.gsap` when you bundle GSAP (HyperFrames' render shim then breaks nested timelines).
- Releases are published to npm (with provenance) and to GitHub Packages.

## 0.2.1 - 2026-10-10

### Added

- `MountedComposition.replace(tree)`: mounts a new tree hidden until it is ready, then shows it and disposes the current one (preview data updates, HMR). If it fails, the current tree stays.
- `CompositionTree` type.

### Changed

- A nested `Clip` snaps its own absolute time (the parent's exact start plus `start`) instead of offsetting the parent's snapped start, so it lands on the same frame as anything else placed at that absolute time (e.g. static audio). It can move by one frame.
- A zero-length `Clip` is not mounted instead of throwing; negative durations still throw.

### Fixed

- `mountComposition` removes the partly mounted tree when mounting fails.

## 0.2.0 - 2026-10-10

Published privately on GitHub Packages to try the new runtime in a real project; not on npm yet. The runtime is rebuilt around the HyperFrames contract: it builds the composition DOM and lets HyperFrames handle time, clip visibility and animations.

### Breaking changes

- **No clock, no GSAP.** `registerClock`, `requestRender` and `FRAME_EPSILON` are gone, and `gsap` is no longer a dependency. HyperFrames seeks the animations itself: use CSS animations, the Web Animations API, GSAP (registering your own timeline) or any other runtime HyperFrames supports.
- **Frame-driven DOM is gone:** `Frame`, `registerUpdater`, `TimeShift` and `applyStyle`. Animate with one of the runtimes above.
- **Timing is in seconds and backed by HyperFrames clips.** `Sequence` is replaced by `<Clip start duration>` (seconds), which renders `data-start` / `data-duration`. `Loop`, `TransitionSeries`, `linearTiming` and `slide` are gone: a transition is two overlapping clips whose contents animate.
- **`mountComposition(compositionId, tree)`** reads fps, size and duration from the root's `data-*` attributes (was `mountComposition(tree, container, config)` with frame counts), holds HyperFrames through `window.__hf.buildReady` until it is done, and accepts an async function for the tree. It resolves to `{ root, config, dispose }`.
- `useVideoConfig()` is `getVideoConfig()` and returns `{ fps, width, height, duration }` (seconds); `useSequenceTiming()` is `getClipTiming()` (`{ start, duration }`, absolute seconds); `useContext()` is `readContext()`; `Context.Consumer` is gone.
- `afterMounted` and `useElementSize` are gone: measure and build animations in `onMounted`.
- `AbsoluteFill` / `ABSOLUTE_FILL`, `Img` and `staticFile` (the `/static-file` entry) are gone. `<img>` elements are decoded automatically before rendering; public files are plain relative URLs.
- The Vite plugin is `hyperframesJsx()` (was `hyperframes()`).
- JSX props and `style` are typed: unknown attributes, unknown CSS properties and event handlers are type errors. Custom elements (`<my-element>`) still accept any attribute.
- `data-*` / `aria-*` booleans are written as `"true"` / `"false"` (as React does).

### Added

- `include` / `exclude` plugin options to scope the JSX runtime to some files.
- The root gets `data-no-timeline` when no timeline was registered, so HyperFrames does not wait for one.
- Clip ends snap to the frame grid, so adjacent clips meet on the same frame.
- `vite` is an optional peer dependency, so the runtime can be used without it.
- `examples/basic`, rendered with HyperFrames in CI.

### Fixed

- Vendor-prefixed unitless CSS properties (`WebkitLineClamp`) no longer get `px`.
- More SVG attributes keep their camelCase name (`pointsAtX`, `targetX`, `kernelUnitLength`...).
- Two copies of the runtime (e.g. one pre-bundled) share the build state.
- The global `Window` type is no longer augmented.

## 0.1.0

Initial version, published privately on GitHub Packages.
