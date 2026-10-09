// @vitest-environment node
import { fileURLToPath } from "node:url";
import { build, type Plugin, type Rolldown, type UserConfig } from "vite";
import { describe, expect, it } from "vitest";
import { hyperframesJsx } from "../index";

const PACKAGE = "@inurun/vite-plugin-hyperframes-jsx";
const src = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));

function configOf(plugin: Plugin): UserConfig {
  const hook = plugin.config as () => UserConfig;
  return hook();
}

async function transform(plugin: Plugin, code: string, id: string) {
  const hook = plugin.transform as { handler: (code: string, id: string) => unknown };
  return hook.handler.call({}, code, id) as { code: string } | null;
}

describe("hyperframesJsx", () => {
  it("sets the project-wide JSX import source and excludes the package from pre-bundling", () => {
    const plugin = hyperframesJsx();
    expect(configOf(plugin)).toEqual({
      oxc: { jsx: { runtime: "automatic", importSource: PACKAGE } },
      optimizeDeps: { exclude: [PACKAGE] },
    });
    expect(plugin.transform).toBeUndefined();
  });

  it("only adds the pragma to included files when include is set", async () => {
    const plugin = hyperframesJsx({ include: "**/video/**", exclude: "**/skip.tsx" });
    expect(configOf(plugin)).toEqual({ optimizeDeps: { exclude: [PACKAGE] } });
    const code = "export const a = <div />;";
    expect((await transform(plugin, code, "/app/video/a.tsx"))?.code).toBe(
      `/** @jsxImportSource ${PACKAGE} */ ${code}`,
    );
    expect(await transform(plugin, code, "/app/admin/a.tsx")).toBeNull();
    expect(await transform(plugin, code, "/app/video/skip.tsx")).toBeNull();
    expect(await transform(plugin, code, "/app/video/a.ts")).toBeNull();
    const pragma = `/** @jsxImportSource preact */\n${code}`;
    expect(await transform(plugin, pragma, "/app/video/b.tsx")).toBeNull();
  });

  it.each([
    ["project-wide", hyperframesJsx()],
    ["scoped", hyperframesJsx({ include: "**/video/**" })],
  ])("compiles JSX with this runtime in a Vite build (%s)", async (_name, plugin) => {
    const output = (await build({
      configFile: false,
      logLevel: "silent",
      root: src("__tests__/fixtures/app"),
      plugins: [plugin],
      resolve: {
        alias: [
          { find: `${PACKAGE}/runtime`, replacement: src("runtime.ts") },
          { find: `${PACKAGE}/jsx-runtime`, replacement: src("jsx-runtime.ts") },
          { find: `${PACKAGE}/jsx-dev-runtime`, replacement: src("jsx-dev-runtime.ts") },
        ],
      },
      build: {
        write: false,
        minify: false,
        lib: { entry: "main.ts", formats: ["es"], fileName: "main" },
        rolldownOptions: { external: ["gsap"] },
      },
    })) as Rolldown.RolldownOutput[];
    const code = output[0]!.output[0].code;
    expect(code).toContain("$$hf: true");
    expect(code).toContain('"data-testid": "video"');
    expect(code).not.toContain("react/jsx");
  });
});
