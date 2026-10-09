# Basic example

Two title cards joined by a slide transition, rendered by HyperFrames.

```sh
pnpm install          # at the repository root
pnpm build            # builds the package (the example uses it from the workspace)
cd examples/basic
pnpm dev              # preview in the browser
pnpm render           # vite build + hyperframes render → renders/basic.mp4
pnpm check:render     # checks frame count and colors of the rendered video (needs ffmpeg)
```

- `index.html` is the composition root HyperFrames reads (`data-composition-id`, size, fps, duration).
- `src/main.tsx` mounts the tree into it and registers the clock.
- `src/video.tsx` is the composition.
