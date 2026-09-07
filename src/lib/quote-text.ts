import type { OrderItem, OrderItemPricing } from "@/lib/orders"
import { isStickerLabelCategory } from "@/lib/order-line-item"
import { scaleQuotation } from "@/lib/sticker-quotation"
import { formatCurrency } from "@/lib/utils"

export type CopyableLineItem = {
  options: { name: string; value: string }[]
  pricing: OrderItemPricing | null
  stickerQuotation: OrderItem["stickerQuotation"]
  quantity: number
  lineTotal: number
  notes?: string
}

/** True for both sticker product lines ("Sticker"/"Sticker Label" and "Laminated Sticker") —
 *  used to pick the compact copy-text template in `buildStickerCopyLines`. */
export function usesCompactStickerCopyFormat(category: string | null | undefined): boolean {
  return isStickerLabelCategory(category) || category?.trim().toLowerCase() === "laminated sticker"
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

/** Compact copy-text layout for sticker items (see `usesCompactStickerCopyFormat`) — drops the
 * Qty line and other option lines (e.g. "Type"), adds an item-notes line, and merges the
 * "to receive" pcs count into the Amount line instead of listing them separately. Copy-text
 * only: the visual Order Summary panel keeps using `buildLineItemInfoLines` unchanged. */
export function buildStickerCopyLines(item: CopyableLineItem): string[] {
  const lines: string[] = []

  const trimmedNotes = item.notes?.trim()
  if (trimmedNotes) lines.push(trimmedNotes)

  if (item.pricing && item.stickerQuotation) {
    lines.push(
      `Size: ${item.stickerQuotation.width} × ${item.stickerQuotation.height} ${item.stickerQuotation.unit}`
    )
  }

  const packageOption = item.options.find((option) => option.name === "Package" && option.value)
  if (packageOption) lines.push(`Package: ${packageOption.value}`)

  const totalQuotation = item.stickerQuotation ? scaleQuotation(item.stickerQuotation, item.quantity) : null
  if (item.pricing && totalQuotation) {
    lines.push(
      `${formatCurrency(item.lineTotal)} = ${totalQuotation.quantity} pcs` +
        (totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : "")
    )
  } else if (item.pricing) {
    lines.push(`Amount: ${formatCurrency(item.lineTotal)}`)
  }

  return lines
}

/** Assembles per-item detail lines into the full copyable item section — separators between
 * items and after the last item. No item name/header is printed in the copied text. */
export function buildCopyableOrderText(items: { name: string; lines: string[] }[]): string[] {
  const infoLines: string[] = []

  items.forEach((item, index) => {
    if (index > 0) {
      infoLines.push("")
      infoLines.push("***************************")
      infoLines.push("")
    }
    infoLines.push(...item.lines)

    if (index + 1 === items.length) {
      infoLines.push("")
      infoLines.push("***************************")
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
  const lines = ["Order Summary:", "", ...input.infoLines, `Subtotal: ${formatCurrency(input.subtotal)}`]

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

/** Standing shipping-fee blurb ("SF") appended to a copied quote by the Calculator page's
 * "Copy with SF" action (Sticker and Laminated Sticker categories only). The quoted amount
 * is the app's configured default shipping fee (App Settings → Shipping Settings), not a
 * hardcoded figure, so the two stay in sync automatically when that setting changes. */
function buildShippingFeeNote(shippingFee: number): string {
  return (
    `🚚Standard shipping po is ${formatCurrency(shippingFee)} nationwide \n\n` +
    "⭐️Free shipping kapag ang order nyo po is worth ₱1000 and above"
  )
}

/** Appends the shipping-fee note below an already-formatted copyable quote/summary,
 * separated by two blank lines. */
export function appendShippingFeeNote(summaryText: string, shippingFee: number): string {
  return `${summaryText}\n\n\n${buildShippingFeeNote(shippingFee)}`
}
