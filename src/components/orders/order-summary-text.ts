import type { OrderItem, OrderItemPricing } from "@/lib/orders"
import type { Product } from "@/lib/products"
import {
  buildCopyableOrderText,
  buildLineItemInfoLines,
  buildStickerCopyLines,
  formatOrderSummaryText,
  usesCompactStickerCopyFormat,
  type CopyableLineItem,
} from "@/lib/quote-text"

export type LineItemSummary = {
  /** The line item's draft id — lets the summary panel key rows so they animate when reordered. */
  id?: string
  product: Product | null
  optionValues: Record<string, string>
  pricing: OrderItemPricing | null
  quantity: number
  lineTotal: number
  stickerQuotation: OrderItem["stickerQuotation"]
  notes: string
}

function toCopyableLineItem(item: LineItemSummary): CopyableLineItem {
  return {
    options: item.product!.options.map((option) => ({
      name: option.name,
      value: item.optionValues[option.id] ?? "",
    })),
    pricing: item.pricing,
    stickerQuotation: item.stickerQuotation,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    notes: item.notes,
  }
}

export function itemInfoLines(item: LineItemSummary): string[] {
  if (!item.product) return []

  return buildLineItemInfoLines(toCopyableLineItem(item))
}

/** The order summary as clipboard text, or null when no item has a product with pricing yet. */
export function buildOrderSummaryCopyText({
  items,
  discount,
  additionalFees,
  layoutFee,
  shippingFee,
  notes,
}: {
  items: LineItemSummary[]
  discount: number
  additionalFees: number
  layoutFee: number
  shippingFee: number
  notes: string
}): string | null {
  const copyableItems = items.filter((item) => item.product && item.pricing)
  if (copyableItems.length === 0) return null

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const total = Math.max(subtotal + additionalFees + layoutFee + shippingFee - discount, 0)

  const infoLines = buildCopyableOrderText(
    copyableItems.map((item) => ({
      name: item.product!.name,
      lines: usesCompactStickerCopyFormat(item.product!.category)
        ? buildStickerCopyLines(toCopyableLineItem(item))
        : itemInfoLines(item),
    }))
  )

  return formatOrderSummaryText({
    infoLines,
    subtotal,
    additionalFees,
    layoutFee,
    shippingFee,
    discount,
    total,
    notes,
  })
}
