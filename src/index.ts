import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/** This package: the JSX import source and the runtime import specifier. */
const PACKAGE_NAME = "vite-plugin-hyperframes-jsx";

export type HyperframesHtmlOptions = {
  compositionId: string;
  durationSec: number;
  fps: number;
  width: number;
  height: number;
};

export type HyperframesOptions = {
  /** Fills `%HF_*%` placeholders in a static index.html. */
  html?: HyperframesHtmlOptions;
  /** Symlinks `<dir>/<name>` into outDir after build instead of copying large assets. */
  publicLinks?: { dir: string; names: string[] };
};

function readLink(file: string) {
  try {
    return fs.lstatSync(file).isSymbolicLink() ? fs.readlinkSync(file) : null;
  } catch {
    return null;
  }
}

export function hyperframes(options: HyperframesOptions = {}): Plugin[] {
  const { html } = options;
  const placeholders: Record<string, string> = html
    ? {
        "%HF_COMPOSITION_ID%": html.compositionId,
        "%HF_DURATION%": String(html.durationSec),
        "%HF_FPS%": String(html.fps),
        "%HF_WIDTH%": String(html.width),
        "%HF_HEIGHT%": String(html.height),
      }
    : {};
  let outDir = "";

  return [
    {
      name: "hf-jsx",
      config: () => ({
        oxc: { jsx: { runtime: "automatic", importSource: PACKAGE_NAME } },
        // A pre-bundled second copy would split module state (the build scope) between the
        // JSX runtime and the runtime API.
        optimizeDeps: { exclude: [PACKAGE_NAME] },
      }),
    },
    {
      name: "hf-html",
      transformIndexHtml: (source) =>
        Object.entries(placeholders).reduce(
          (result, [key, value]) => result.replaceAll(key, value),
          source,
        ),
    },
    {
      name: "hf-public-links",
      apply: "build",
      configResolved: (config) => {
        outDir = path.resolve(config.root, config.build.outDir);
      },
      closeBundle: () => {
        const links = options.publicLinks;
        if (!links) {
          return;
        }
        for (const name of links.names) {
          const link = path.join(outDir, name);
          const target = path.resolve(links.dir, name);
          if (readLink(link) === target) {
            continue;
          }
          // `existsSync` follows links, so a dangling one would make symlinkSync throw EEXIST.
          fs.rmSync(link, { recursive: true, force: true });
          fs.symlinkSync(target, link);
        }
      },
    },
  ];
}
