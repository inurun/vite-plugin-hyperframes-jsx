# Changelog

All notable changes to this package are listed here. The project follows [Semantic Versioning](https://semver.org/); before 1.0, breaking changes bump the minor version.

## 0.2.0 (unreleased)

First release on npm.

### Breaking changes

- The Vite plugin is `hyperframesJsx()` (was `hyperframes()`).
- `registerClock(compositionId, composition)` takes fps and duration from `composition.config` (was `registerClock(compositionId, composition, fps, durationInFrames)`).
- `MountedComposition` is `{ config, renderFrame, dispose }`; `root` (the internal timing tree) is gone.
- `gsap` is a peer dependency: install it next to this package.
- JSX props and `style` are typed: unknown attributes, unknown CSS properties and event handlers are type errors. Custom elements (`<my-element>`) still accept any attribute.
- `data-*` / `aria-*` booleans are written as `"true"` / `"false"` (as React does) instead of being a boolean attribute or omitted.
- Invalid configs and props throw (see the README) instead of rendering something unexpected.
- The global `Window` type is no longer augmented with `__timelines` and `gsap`.

### Added

- `include` / `exclude` plugin options to scope the JSX runtime to some files.
- `Clock.timeline`, `Clock.requestRender()` and `Clock.dispose()`; `MountedComposition.dispose()`. Registering a clock for an id that already has one disposes the old one; `requestRender()` re-renders every clock.
- Exported prop types for every primitive, `HtmlProps`, `SvgProps`, `Updater`, `MountedCallback`, `CustomMount`.
- `Img` warns when an image cannot be decoded.
- `vite` is an optional peer dependency, so the runtime can be used without it.
- `examples/basic`, rendered with HyperFrames in CI.

### Fixed

- Vendor-prefixed unitless CSS properties (`WebkitLineClamp`) no longer get `px`.
- More SVG attributes keep their camelCase name (`pointsAtX`, `targetX`, `kernelUnitLength`...).
- Two copies of the runtime (e.g. one pre-bundled) share the build state and the clocks.

## 0.1.0

Initial version, published privately on GitHub Packages.
