import { CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { copyToClipboard } from "@/lib/clipboard"
import type { OrderItemPricing } from "@/lib/orders"
import type { Product } from "@/lib/products"
import { formatOrderSummaryText } from "@/lib/quote-text"
import { scaleQuotation } from "@/lib/sticker-quotation"
import { formatCurrency } from "@/lib/utils"

export function OrderSummaryPanel({
  product,
  optionValues,
  pricing,
  quantity,
  lineTotal,
  discount,
  additionalFees,
  layoutFee,
  shippingFee,
  stickerQuotationResult,
}: {
  product: Product | null
  optionValues: Record<string, string>
  pricing: OrderItemPricing | null
  quantity: number
  lineTotal: number
  discount: number
  additionalFees: number
  layoutFee: number
  shippingFee: number
  stickerQuotationResult: { quantity: number; free?: number } | null
}) {
  const total = Math.max(lineTotal + additionalFees + layoutFee + shippingFee - discount, 0)
  const totalQuotation = stickerQuotationResult
    ? scaleQuotation(stickerQuotationResult, quantity)
    : null

  const showsQuantity = !!pricing

  function handleCopy() {
    if (!product || !pricing) return

    const infoLines = [product.name]

    for (const option of product.options) {
      if (optionValues[option.id]) infoLines.push(`${option.name}: ${optionValues[option.id]}`)
    }

    if (pricing.pricingType === "Package") infoLines.push(pricing.packageName)
    if (pricing.pricingType === "Per Unit") {
      infoLines.push(
        `${formatCurrency(pricing.unitPrice)} / ${pricing.unit}` +
          (pricing.width && pricing.height ? ` · ${pricing.width} × ${pricing.height} ft` : "")
      )
    }
    if (pricing.pricingType === "Fixed") {
      infoLines.push(`${formatCurrency(pricing.unitPrice)} / ${pricing.unit}`)
    }
    if (pricing.pricingType === "Manual") infoLines.push(pricing.productName)
    if (pricing.pricingType === "Custom") {
      infoLines.push(`${pricing.packageName} · ${pricing.width} × ${pricing.height} in`)
    }

    if (totalQuotation) {
      infoLines.push(
        `${product.category} Quotation: ${totalQuotation.quantity} pcs` +
          (totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : "")
      )
    }

    if (showsQuantity) infoLines.push(`Quantity: ${quantity}`)

    copyToClipboard(
      formatOrderSummaryText({
        infoLines,
        subtotal: lineTotal,
        additionalFees,
        layoutFee,
        shippingFee,
        discount,
        total,
      })
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        {product && pricing && (
          <CardAction>
            <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy order summary">
              <CopyIcon />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!product ? (
          <p className="text-sm text-muted-foreground">Select a product to see a summary.</p>
        ) : (
          <>
            <p className="font-medium">{product.name}</p>

            {product.options.map((option) =>
              optionValues[option.id] ? (
                <p key={option.id} className="text-sm text-muted-foreground">
                  {option.name}: {optionValues[option.id]}
                </p>
              ) : null
            )}

            {pricing?.pricingType === "Package" && (
              <p className="text-sm text-muted-foreground">{pricing.packageName}</p>
            )}
            {pricing?.pricingType === "Per Unit" && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(pricing.unitPrice)} / {pricing.unit}
                {pricing.width && pricing.height && (
                  <> · {pricing.width} × {pricing.height} ft</>
                )}
              </p>
            )}
            {pricing?.pricingType === "Fixed" && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(pricing.unitPrice)} / {pricing.unit}
              </p>
            )}
            {pricing?.pricingType === "Manual" && (
              <p className="text-sm text-muted-foreground">{pricing.productName}</p>
            )}
            {pricing?.pricingType === "Custom" && (
              <p className="text-sm text-muted-foreground">
                {pricing.packageName} · {pricing.width} × {pricing.height} in
              </p>
            )}

            {totalQuotation && (
              <p className="text-sm text-muted-foreground">
                {product.category} Quotation: {totalQuotation.quantity} pcs
                {totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : ""}
              </p>
            )}

            {showsQuantity && <p className="text-sm text-muted-foreground">Quantity: {quantity}</p>}

            {pricing && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(lineTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Additional Fees</span>
                  <span>{formatCurrency(additionalFees)}</span>
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
          </>
        )}
      </CardContent>
    </Card>
  )
}
