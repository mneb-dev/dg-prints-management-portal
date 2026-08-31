import { formatCurrency } from "@/lib/utils"

export type OrderSummaryTextInput = {
  infoLines: string[]
  subtotal: number
  additionalFees: number
  layoutFee: number
  shippingFee: number
  discount: number
  total: number
}

/** Order summary as copyable plain text — omits fee/discount lines that are 0. */
export function formatOrderSummaryText(input: OrderSummaryTextInput): string {
  const lines = [...input.infoLines, `Subtotal: ${formatCurrency(input.subtotal)}`]

  if (input.additionalFees !== 0) lines.push(`Additional Fees: ${formatCurrency(input.additionalFees)}`)
  if (input.layoutFee !== 0) lines.push(`Layout Fee: ${formatCurrency(input.layoutFee)}`)
  if (input.shippingFee !== 0) lines.push(`Shipping Fee: ${formatCurrency(input.shippingFee)}`)
  if (input.discount !== 0) lines.push(`Discount: ${formatCurrency(input.discount)}`)

  lines.push(`Total: ${formatCurrency(input.total)}`)
  return lines.join("\n")
}
