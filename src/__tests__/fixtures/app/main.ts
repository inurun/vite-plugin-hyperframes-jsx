import { jsx, mountComposition } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { Video } from "./video/video";

export const mounted = mountComposition(jsx(Video, {}), document.body, {
  fps: 30,
  width: 640,
  height: 360,
  durationInFrames: 30,
});
