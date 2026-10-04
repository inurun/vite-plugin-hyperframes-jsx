/** Public-dir asset URL relative to the composition HTML (works under `base: "./"`). */
export function staticFile(path: string) {
  return path
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
