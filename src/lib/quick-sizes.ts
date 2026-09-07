import type { CommonSize } from "@/lib/categories"

/** Chip label for a quick size — the dimensions themselves double as the label, since quick
 * sizes have no separate name/title field. */
export function formatSize(size: CommonSize): string {
  return `${size.width} × ${size.height} ${size.unit}`
}

/** Orientation-insensitive, exact-unit grouping key — mirrors the `hot_sizes` SQL function's
 * canonical key exactly, so a client-side duplicate check (e.g. warning an admin who tries
 * to add a common size that already exists in a different orientation) agrees with how the
 * backend dedupes hot sizes against configured common sizes. */
export function canonicalSizeKey(size: CommonSize): string {
  return `${size.unit}:${Math.min(size.width, size.height)}x${Math.max(size.width, size.height)}`
}
