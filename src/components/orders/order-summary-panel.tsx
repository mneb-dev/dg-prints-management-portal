import type { ReactNode } from "react"
import { ReceiptTextIcon } from "lucide-react"

import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { itemInfoLines, type LineItemSummary } from "@/components/orders/order-summary-text"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn, formatCurrency } from "@/lib/utils"

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="min-w-0 truncate text-muted-foreground" title={label}>
        {label}
      </dt>
      <dd className={cn("shrink-0 tabular-nums", valueClassName)}>{value}</dd>
    </div>
  )
}

/** Subtotal → fees → discount → total, with ₱0 rows hidden, the discount shown as a teal "−₱X"
 * and the total as the visual anchor. Shared by the order form's live summary (computed values)
 * and the View Order page (the order's stored values, so it always matches what was saved). */
export function OrderTotals({
  subtotal,
  additionalFees,
  feeNote,
  layoutFee,
  layoutByName,
  shippingFee,
  discount,
  total,
}: {
  subtotal: number
  additionalFees: number
  feeNote?: string
  layoutFee: number
  /** Shown as a small "by Maria" note under the layout fee (View Order only). */
  layoutByName?: string
  shippingFee: number
  discount: number
  total: number
}) {
  const note = feeNote?.trim()
  return (
    <>
      <dl className="flex flex-col gap-1.5 text-sm">
        <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
        {additionalFees > 0 && (
          <SummaryRow
            label={note ? `Additional fees (${note})` : "Additional fees"}
            value={formatCurrency(additionalFees)}
          />
        )}
        {layoutFee > 0 && (
          <div className="flex flex-col gap-0.5">
            <SummaryRow label="Layout fee" value={formatCurrency(layoutFee)} />
            {layoutByName ? <span className="text-xs text-muted-foreground">by {layoutByName}</span> : null}
          </div>
        )}
        {shippingFee > 0 && <SummaryRow label="Shipping" value={formatCurrency(shippingFee)} />}
        {discount > 0 && (
          <SummaryRow
            label="Discount"
            value={`−${formatCurrency(discount)}`}
            valueClassName="text-order-status-teal"
          />
        )}
      </dl>
      <Separator />
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-2xl leading-none font-semibold tabular-nums">{formatCurrency(total)}</span>
      </div>
    </>
  )
}

export function OrderSummaryPanel({
  items,
  discount,
  additionalFees,
  layoutFee,
  shippingFee,
  notes,
  footer,
}: {
  items: LineItemSummary[]
  discount: number
  additionalFees: number
  layoutFee: number
  shippingFee: number
  notes: string
  /** Rendered under the total — the form passes its submit/cancel actions here so they sit in
   * the sticky panel on desktop. */
  footer?: ReactNode
}) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const total = Math.max(subtotal + additionalFees + layoutFee + shippingFee - discount, 0)
  const hasAnyProduct = items.some((item) => item.product)

  return (
    <Card>
      <CardHeader>
        <OrderFormSectionHeader icon={ReceiptTextIcon} title="Order summary" description="Updates as you fill in the form" />
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
            <OrderTotals
              subtotal={subtotal}
              additionalFees={additionalFees}
              feeNote={notes}
              layoutFee={layoutFee}
              shippingFee={shippingFee}
              discount={discount}
              total={total}
            />
          </>
        )}

        {footer ? <div className="mt-1">{footer}</div> : null}
      </CardContent>
    </Card>
  )
}
