import { describe, expect, it } from "vitest";
import { assetUrl } from "../asset-url";

describe("assetUrl", () => {
  it("returns a relative, encoded URL", () => {
    expect(assetUrl("/images/a b.png")).toBe("images/a%20b.png");
    expect(assetUrl("fonts/#1.woff2")).toBe("fonts/%231.woff2");
  });
});
