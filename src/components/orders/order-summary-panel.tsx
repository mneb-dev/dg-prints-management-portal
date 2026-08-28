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
}: {
  product: Product | null
  optionValues: Record<string, string>
  pricing: OrderItemPricing | null
  quantity: number
  lineTotal: number
  discount: number
}) {
  const total = Math.max(lineTotal - discount, 0)

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
