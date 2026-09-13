import type { CommonSize } from "@/lib/categories"

/** Chip label for a quick size — the dimensions themselves double as the label, since quick
 * sizes have no separate name/title field. */
export function formatSize(size: CommonSize): string {
  return `${size.width} × ${size.height} ${size.unit}`
}
