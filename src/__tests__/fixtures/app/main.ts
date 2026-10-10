import { jsx, mountComposition } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { Video } from "./video/video";

export const mounted = mountComposition("main", jsx(Video, {}));
