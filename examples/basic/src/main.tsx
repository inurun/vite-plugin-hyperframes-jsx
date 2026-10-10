import "./styles.css";
import { mountComposition } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { Video } from "./video";

// Synchronously, before any await: HyperFrames waits for the mount from its first check.
void mountComposition("main", <Video />);
