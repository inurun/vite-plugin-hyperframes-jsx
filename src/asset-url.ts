/** Public-dir asset URL relative to the composition HTML (works under `base: "./"`). */
export function assetUrl(path: string) {
  return path
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
