import type { Plugin } from "vite";

/** This package: the JSX import source and the runtime import specifier. */
const PACKAGE_NAME = "vite-plugin-hyperframes-jsx";

export function hyperframes(): Plugin {
  return {
    name: "hyperframes-jsx",
    config: () => ({
      oxc: { jsx: { runtime: "automatic", importSource: PACKAGE_NAME } },
      // A pre-bundled second copy would split module state (the build scope) between the
      // JSX runtime and the runtime API.
      optimizeDeps: { exclude: [PACKAGE_NAME] },
    }),
  };
}
