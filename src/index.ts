import { createFilter, type FilterPattern, type Plugin } from "vite";
import { name as PACKAGE_NAME } from "../package.json";

export type HyperframesJsxOptions = {
  /**
   * Files compiled with this package's JSX runtime. When omitted, it becomes the JSX import
   * source of the whole project. When set (e.g. `"src/video/**"`), only matching `.jsx` /
   * `.tsx` files get it, so another framework (React...) can own JSX elsewhere.
   */
  include?: FilterPattern;
  /** Files excluded from `include`. */
  exclude?: FilterPattern;
};

const JSX_FILE = /\.[jt]sx$/;
const PRAGMA = /@jsxImportSource\s/;

/** The Vite plugin: compiles JSX with this package's runtime. */
export function hyperframesJsx(options: HyperframesJsxOptions = {}): Plugin {
  const scoped = options.include !== undefined || options.exclude !== undefined;
  const filter = createFilter(options.include ?? JSX_FILE, options.exclude);
  return {
    name: "hyperframes-jsx",
    enforce: "pre",
    config: () => ({
      ...(scoped ? {} : { oxc: { jsx: { runtime: "automatic", importSource: PACKAGE_NAME } } }),
      // A pre-bundled second copy would split module state (the build scope) between the
      // JSX runtime and the runtime API.
      optimizeDeps: { exclude: [PACKAGE_NAME] },
    }),
    transform: scoped
      ? {
          filter: { id: JSX_FILE },
          handler(code, id) {
            const path = id.split("?", 1)[0]!;
            if (!JSX_FILE.test(path) || !filter(path) || PRAGMA.test(code)) {
              return null;
            }
            // Same line as the first line of code, so the line mappings stay valid.
            return { code: `/** @jsxImportSource ${PACKAGE_NAME} */ ${code}`, map: null };
          },
        }
      : undefined,
  };
}
