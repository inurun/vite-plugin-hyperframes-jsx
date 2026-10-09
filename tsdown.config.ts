import { defineConfig } from "tsdown";

export default defineConfig([
  {
    // The Vite plugin runs in Node.
    entry: { index: "src/index.ts" },
    platform: "node",
    format: "esm",
    dts: true,
    fixedExtension: false,
  },
  {
    // The runtime runs in the composition page.
    entry: {
      runtime: "src/runtime.ts",
      "jsx-runtime": "src/jsx-runtime.ts",
      "jsx-dev-runtime": "src/jsx-dev-runtime.ts",
      "static-file": "src/static-file.ts",
    },
    platform: "browser",
    target: "es2022",
    format: "esm",
    dts: true,
    fixedExtension: false,
  },
]);
