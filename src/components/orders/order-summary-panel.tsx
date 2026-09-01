import { CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { copyToClipboard } from "@/lib/clipboard"
import type { OrderItem, OrderItemPricing } from "@/lib/orders"
import type { Product } from "@/lib/products"
import { formatOrderSummaryText } from "@/lib/quote-text"
import { scaleQuotation } from "@/lib/sticker-quotation"
import { formatCurrency } from "@/lib/utils"

export type LineItemSummary = {
  product: Product | null
  optionValues: Record<string, string>
  pricing: OrderItemPricing | null
  quantity: number
  lineTotal: number
  stickerQuotation: OrderItem["stickerQuotation"]
}

function pricingLine(pricing: OrderItemPricing): string | null {
  if (pricing.pricingType === "Package") return `Package: ${pricing.packageName}`
  if (pricing.pricingType === "Per Unit") {
    return pricing.width && pricing.height ? `Size: ${pricing.width} × ${pricing.height} ft` : null
  }
  if (pricing.pricingType === "Fixed") return `${formatCurrency(pricing.unitPrice)} / ${pricing.unit}`
  if (pricing.pricingType === "Manual") return pricing.productName
  if (pricing.pricingType === "Custom") return `${pricing.packageName} · ${pricing.width} × ${pricing.height} in`
  return null
}

function itemInfoLines(item: LineItemSummary): string[] {
  if (!item.product) return []
  const lines: string[] = []

  for (const option of item.product.options) {
    if (item.optionValues[option.id]) lines.push(`${option.name}: ${item.optionValues[option.id]}`)
  }

  if (item.pricing) {
    const line = pricingLine(item.pricing)
    if (line) lines.push(line)
    if (item.pricing.pricingType === "Package" && item.stickerQuotation) {
      lines.push(
        `Size: ${item.stickerQuotation.width} × ${item.stickerQuotation.height} ${item.stickerQuotation.unit}`
      )
    }
  }

  if (item.stickerQuotation) {
    lines.push(
      `Base Quote: ${item.stickerQuotation.quantity} pcs` +
        (item.stickerQuotation.free ? ` + ${item.stickerQuotation.free} pcs free` : "")
    )
  }

  if (item.pricing) lines.push(`Qty: ${item.quantity}`)

  const totalQuotation = item.stickerQuotation
    ? scaleQuotation(item.stickerQuotation, item.quantity)
    : null
  if (totalQuotation) {
    lines.push(
      `To receive: ${totalQuotation.quantity} pcs` +
        (totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : "")
    )
  }

  if (item.pricing) lines.push(`Amount: ${formatCurrency(item.lineTotal)}`)

  return lines
}

export function OrderSummaryPanel({
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
}) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const total = Math.max(subtotal + additionalFees + layoutFee + shippingFee - discount, 0)
  const hasAnyProduct = items.some((item) => item.product)
  const copyableItems = items.filter((item) => item.product && item.pricing)

  function handleCopy() {
    if (copyableItems.length === 0) return

    const infoLines: string[] = []
    copyableItems.forEach((item, index) => {
      if (index > 0) infoLines.push("-----")
      infoLines.push(
        copyableItems.length > 1 ? `Item ${index + 1}: ${item.product!.name}` : item.product!.name
      )
      infoLines.push(...itemInfoLines(item))

      if (index + 1 === copyableItems.length) infoLines.push("=====")
    })

    copyToClipboard(
      formatOrderSummaryText({
        infoLines,
        subtotal,
        additionalFees,
        layoutFee,
        shippingFee,
        discount,
        total,
        notes,
      })
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        {copyableItems.length > 0 && (
          <CardAction>
            <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy order summary">
              <CopyIcon />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!hasAnyProduct ? (
          <p className="text-sm text-muted-foreground">Select a product to see a summary.</p>
        ) : items.length === 1 ? (
          <>
            <p className="font-medium">{items[0].product!.name}</p>
            {itemInfoLines(items[0]).map((line) => (
              <p key={line} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))}
          </>
        ) : (
          items.map((item, index) => (
            <div key={index} className="flex flex-col gap-1">
              <p className="font-medium">
                Item {index + 1}:{" "}
                {item.product?.name ?? (item.lineTotal > 0 ? "Product unavailable" : "Select a product")}
              </p>
              {itemInfoLines(item).map((line) => (
                <p key={line} className="text-sm text-muted-foreground">
                  {line}
                </p>
              ))}
              {index < items.length - 1 && <Separator className="mt-2" />}
            </div>
          ))
        )}

        {hasAnyProduct && (items.length > 1 || !!items[0]?.pricing) && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Additional Fees</span>
              <span>
                {formatCurrency(additionalFees)}
                {notes.trim() && ` (${notes.trim()})`}
              </span>
            </div>
            {layoutFee >= 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Layout Fee</span>
                <span>{formatCurrency(layoutFee)}</span>
              </div>
            )}
            {shippingFee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping Fee</span>
                <span>{formatCurrency(shippingFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span>{formatCurrency(discount)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
