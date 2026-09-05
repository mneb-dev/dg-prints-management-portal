import { perUnitDisplayDimensions } from "@/lib/order-line-item"
import type { OrderItem } from "@/lib/orders"

const NOTES_TOKEN_LENGTH = 6

/** Compact, no-space size token for the table's Description column — e.g. "2x2in",
 * "12x18ft", or "3mm|2x2in" for a Sintra custom size (thickness/back-to-back
 * prefix, piped before the dimensions). Mirrors the pricing-type branching in
 * order-item-summary.tsx's itemSizeLabel, but stripped of spaces for compactness. */
function sizeToken(item: OrderItem): string | null {
  if (item.productCategory === "General Merchandise") return null

  const pricing = item.pricing
  if (pricing.pricingType === "Package") {
    const size = pricing.size ?? item.stickerQuotation
    return size ? `${size.width}x${size.height}${size.unit}` : null
  }
  if (pricing.pricingType === "Per Unit") {
    const dimensions = perUnitDisplayDimensions(pricing)
    if (dimensions) return `${dimensions.width}x${dimensions.height}${dimensions.unit}`
  }
  if (pricing.pricingType === "Custom" && pricing.width && pricing.height) {
    const thickness = pricing.packageName.replace(/\s+/g, "")
    return `${thickness}|${pricing.width}x${pricing.height}in`
  }
  return null
}

/** Every item in an order that has notes, in their original order. */
export function notedItems(items: OrderItem[]): OrderItem[] {
  return items.filter((item) => item.notes.trim())
}

/** Untruncated "notes + size" for one item — used per line in the multi-item notes tooltip,
 * where (unlike the table cell) there's no reason to cap the notes length. */
export function describeOrderItemFull(item: OrderItem): { notes: string; size: string | null } {
  return { notes: item.notes.trim(), size: sizeToken(item) }
}

export type OrderItemDescriptionParts = {
  /** Whitespace-stripped notes, capped at 6 characters — null when the item has no notes. */
  notes: string | null
  /** Whether `notes` was cut short from the raw text (needs a "…" + the full-text tooltip). */
  notesTruncated: boolean
  /** No-space size/thickness token. Only ever set alongside `notes` — an item with no notes
   * shows no size, even if it has one, so the column stays keyed to what staff actually wrote. */
  size: string | null
}

/** Structured "notes + size" summary for an order item, used by the orders table's
 * Description column so notes and size can carry distinct visual treatment. */
export function describeOrderItemParts(item: OrderItem): OrderItemDescriptionParts {
  const strippedNotes = item.notes.replace(/\s+/g, "")
  if (!strippedNotes) return { notes: null, notesTruncated: false, size: null }

  const truncated = strippedNotes.length > NOTES_TOKEN_LENGTH
  const notes = truncated ? strippedNotes.slice(0, NOTES_TOKEN_LENGTH) : strippedNotes

  return { notes, notesTruncated: truncated, size: sizeToken(item) }
}
