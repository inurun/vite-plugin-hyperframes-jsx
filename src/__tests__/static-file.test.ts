import { describe, expect, it } from "vitest";
import { staticFile } from "../static-file";

describe("staticFile", () => {
  it("returns a relative, encoded URL", () => {
    expect(staticFile("/images/a b.png")).toBe("images/a%20b.png");
    expect(staticFile("fonts/#1.woff2")).toBe("fonts/%231.woff2");
  });
});
