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

- Leave time to HyperFrames: the runtime builds the DOM once and must not depend on wall-clock time; clips and animations are seeked by HyperFrames.
- Add tests next to the existing ones in `src/__tests__` (`*.test.ts`); JSX type checks go in `src/__tests__/jsx-types.tsx`.
- Write commit messages (and squash-merge titles) as [Conventional Commits](https://www.conventionalcommits.org/): the changelog and the next version come from them.
  - `feat:` and `fix:` (and `perf:`, `revert:`) appear in the changelog and make a release; `feat!:` or a `BREAKING CHANGE:` footer is breaking, which bumps the minor version before 1.0.
  - `compat:` records a check against a new HyperFrames version (e.g. `compat: checked with HyperFrames 0.9.7`); it appears under "Compatibility" and makes a release.
  - `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `build:` and `style:` are left out of the changelog.
  - A squash merge keeps only the PR title, so squash only when the title describes the whole PR; otherwise use a merge commit.

## Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please) in the `Release` workflow:

1. Every push to `main` opens or updates a release PR that bumps `version` in `package.json` and adds the new section to `CHANGELOG.md`. release-please rewrites the PR on every push to `main`, so edits made to it by hand are lost. CI does not run on that PR (it is opened with `GITHUB_TOKEN`); the publish jobs run `pnpm check` before publishing.
2. Merging the release PR tags `v<version>`, creates the GitHub release, and publishes the package to npm (trusted publishing, with provenance) and to GitHub Packages.
3. If a publish fails, fix the cause and run the `Release` workflow by hand: it publishes the version in `package.json` from its tag and skips a registry that already has it.
