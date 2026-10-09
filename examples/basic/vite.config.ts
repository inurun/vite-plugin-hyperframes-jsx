import { defineConfig } from "vite";
import { hyperframesJsx } from "@inurun/vite-plugin-hyperframes-jsx";

export default defineConfig({
  // HyperFrames serves the built files from the project directory.
  base: "./",
  plugins: [hyperframesJsx()],
});
