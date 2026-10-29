/** Public assets must work at / and under a GitHub Pages repository prefix. */
export const appBase = import.meta.env?.BASE_URL || "/";
export function publicAsset(value, base = appBase) {
  if (typeof value !== "string") return value;
  if (value.startsWith("/gemini-vercel-demo/assets/"))
    value = value.slice("/gemini-vercel-demo".length);
  if (value.startsWith("/assets/")) return base.replace(/\/$/, "") + value;
  return value;
}
export function normalizeAssetPaths(value, base = appBase) {
  if (Array.isArray(value))
    return value.map((v) => normalizeAssetPaths(v, base));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        normalizeAssetPaths(v, base),
      ]),
    );
  return publicAsset(value, base);
}
