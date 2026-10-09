# Contributing

Issues and pull requests are welcome. For a larger change, open an issue first so we can agree on the approach.

## Setup

Requires Node.js 22.13+ (24 recommended; the package itself supports `^20.19.0 || >=22.12.0`) and pnpm (the version in `packageManager`; `corepack enable` picks it up).

```sh
pnpm install
pnpm check        # format, lint, types, tests, build, publint and attw: what CI runs
```

Individual scripts: `pnpm test`, `pnpm tsc`, `pnpm lint`, `pnpm format`, `pnpm build`, `pnpm check:package`.

## Rendering the example

`examples/basic` is a workspace package that uses the built package. To check a change against real HyperFrames rendering (needs ffmpeg):

```sh
pnpm build
cd examples/basic
pnpm render
pnpm check:render
```

## Guidelines

- Keep the runtime deterministic: anything rendered must be a pure function of the frame.
- Add tests next to the existing ones in `src/__tests__` (`*.test.ts`); JSX type checks go in `src/__tests__/jsx-types.tsx`.
- Add a line to the "unreleased" section of `CHANGELOG.md` for user-facing changes.

## Releasing

1. Move the "unreleased" changelog entries under the new version and bump `version` in `package.json`.
2. Commit, then push a tag `v<version>`. The `Release` workflow checks the package and publishes it to npm with provenance.
