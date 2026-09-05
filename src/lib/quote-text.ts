import type { OrderItem, OrderItemPricing } from "@/lib/orders"
import { scaleQuotation } from "@/lib/sticker-quotation"
import { formatCurrency } from "@/lib/utils"

export type CopyableLineItem = {
  options: { name: string; value: string }[]
  pricing: OrderItemPricing | null
  stickerQuotation: OrderItem["stickerQuotation"]
  quantity: number
  lineTotal: number
}

/** Per-item detail lines for a copyable order/quote text — shared by the Order Summary panel
 * (live form preview) and the View Order page's Pricing card (saved order) so their copy-to-
 * clipboard output can't drift apart again. */
export function buildLineItemInfoLines(item: CopyableLineItem): string[] {
  const lines: string[] = []

  if (item.pricing) {
    if (item.pricing.pricingType === "Package" && item.stickerQuotation) {
      lines.push(
        `Size: ${item.stickerQuotation.width} × ${item.stickerQuotation.height} ${item.stickerQuotation.unit}`
      )
    }
  }

  for (const option of item.options) {
    let optionNameLine = option.value ? `${option.name}: ${option.value}` : ""

    if (item.stickerQuotation && option.name === "Package") {
      optionNameLine =
        optionNameLine +
        ` • ${item.stickerQuotation.quantity} pcs` +
        (item.stickerQuotation.free ? ` + ${item.stickerQuotation.free} pcs free` : "")
    }

    if (optionNameLine) lines.push(optionNameLine)
  }

  if (item.pricing) lines.push(`Qty: ${item.quantity}`)

  const totalQuotation = item.stickerQuotation ? scaleQuotation(item.stickerQuotation, item.quantity) : null
  if (totalQuotation) {
    lines.push(
      `To receive: ${totalQuotation.quantity} pcs` +
        (totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : "")
    )
  }

  if (item.pricing) lines.push(`Amount: ${formatCurrency(item.lineTotal)}`)

  return lines
}

/** Assembles per-item detail lines into the full copyable item section — item header, blank-line
 * separators between items, and trailing blank lines after the last item. */
export function buildCopyableOrderText(items: { name: string; lines: string[] }[]): string[] {
  const infoLines: string[] = []

  items.forEach((item, index) => {
    if (index > 0) infoLines.push("")
    infoLines.push(items.length > 1 ? `Item ${index + 1}: ${item.name}` : item.name)
    infoLines.push(...item.lines)

    if (index + 1 === items.length) {
      infoLines.push("")
      infoLines.push("")
    }
  })

  return infoLines
}

export type OrderSummaryTextInput = {
  infoLines: string[]
  subtotal: number
  additionalFees: number
  layoutFee: number
  shippingFee: number
  discount: number
  total: number
  notes?: string
}

/** Order summary as copyable plain text — omits fee/discount lines that are 0. */
export function formatOrderSummaryText(input: OrderSummaryTextInput): string {
  const lines = [...input.infoLines, `Subtotal: ${formatCurrency(input.subtotal)}`]

  const trimmedNotes = input.notes?.trim()
  if (trimmedNotes) {
    lines.push(`Additional Fees ${formatCurrency(input.additionalFees)}(${trimmedNotes})`)
  } else if (input.additionalFees !== 0) {
    lines.push(`Additional Fees: ${formatCurrency(input.additionalFees)}`)
  }
  if (input.layoutFee !== 0) lines.push(`Layout Fee: ${formatCurrency(input.layoutFee)}`)
  if (input.shippingFee !== 0) lines.push(`Shipping Fee: ${formatCurrency(input.shippingFee)}`)
  if (input.discount !== 0) lines.push(`Discount: ${formatCurrency(input.discount)}`)

  lines.push(`*Total Due: ${formatCurrency(input.total)}*`)
  return lines.join("\n")
}
