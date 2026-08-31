import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { OrderItemPricing } from "@/lib/orders"
import type { Product } from "@/lib/products"
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
  stickerQuotationResult: { quantity: number; free: number } | null
}) {
  const total = Math.max(lineTotal + additionalFees + layoutFee + shippingFee - discount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
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

            {stickerQuotationResult && (
              <p className="text-sm text-muted-foreground">
                Sticker Quotation: {stickerQuotationResult.quantity} pcs + {stickerQuotationResult.free} pcs free
              </p>
            )}

            {pricing && pricing.pricingType !== "Package" && (
              <p className="text-sm text-muted-foreground">Quantity: {quantity}</p>
            )}

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
