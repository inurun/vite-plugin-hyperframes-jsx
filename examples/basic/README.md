# Basic example

Two scenes joined by a slide transition, rendered by HyperFrames. The animations are plain CSS (`src/styles.css`) and the Web Animations API (`src/video.tsx`); there is no GSAP.

```sh
pnpm install          # at the repository root
pnpm build            # builds the package (the example uses it from the workspace)
cd examples/basic
pnpm dev              # preview in the browser
pnpm render           # vite build + hyperframes render → renders/basic.mp4
pnpm check:render     # checks frame count and colors of the rendered video (needs ffmpeg)
```

- `index.html` is the composition root HyperFrames reads (`data-composition-id`, size, fps, duration).
- `src/main.tsx` mounts the tree into it.
- `src/video.tsx` is the composition: two `<Clip>`s overlapping for the transition.
