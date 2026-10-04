import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    runtime: "src/runtime.ts",
    "jsx-runtime": "src/jsx-runtime.ts",
    "jsx-dev-runtime": "src/jsx-dev-runtime.ts",
    "static-file": "src/static-file.ts",
  },
  format: "esm",
  dts: true,
  fixedExtension: false,
});
