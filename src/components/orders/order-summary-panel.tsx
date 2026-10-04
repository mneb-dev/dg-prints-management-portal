import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react"
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
  className,
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
  className?: string
}) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const total = Math.max(subtotal + additionalFees + layoutFee + shippingFee - discount, 0)
  const hasAnyProduct = items.some((item) => item.product)

  // FLIP for reordered items: each render records where every row sits, and when the item order
  // changes, rows that moved slide from their old spot into the new one instead of jumping.
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const rowTops = useRef(new Map<string, number>())
  const orderKey = items.map((item) => item.id ?? "").join("|")
  const prevOrderKey = useRef(orderKey)
  useLayoutEffect(() => {
    const reordered = orderKey !== prevOrderKey.current
    prevOrderKey.current = orderKey
    const animate = reordered && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const tops = new Map<string, number>()
    rowRefs.current.forEach((el, id) => {
      const top = el.offsetTop
      const previous = rowTops.current.get(id)
      if (animate && previous !== undefined && previous !== top) {
        el.animate([{ transform: `translateY(${previous - top}px)` }, { transform: "none" }], {
          duration: 250,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        })
      }
      tops.set(id, top)
    })
    rowTops.current = tops
    updateMoreBelow()
  })

  // When the panel is height-capped (the form's sticky desktop column), only the item list scrolls
  // so the totals and actions stay in view; a fade at its bottom edge hints at more items below.
  const listRef = useRef<HTMLDivElement>(null)
  const [hasMoreBelow, setHasMoreBelow] = useState(false)
  function updateMoreBelow() {
    const list = listRef.current
    if (!list) return
    setHasMoreBelow(list.scrollHeight - list.scrollTop - list.clientHeight > 1)
  }
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const observer = new ResizeObserver(updateMoreBelow)
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  const showTotals = hasAnyProduct && (items.length > 1 || !!items[0]?.pricing)

  return (
    <Card className={className}>
      <CardHeader>
        <OrderFormSectionHeader icon={ReceiptTextIcon} title="Order summary" description="Updates as you fill in the form" />
      </CardHeader>
      <CardContent
        ref={listRef}
        onScroll={updateMoreBelow}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain",
          hasMoreBelow && "mask-b-from-[calc(100%-2.5rem)]"
        )}
      >
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
            <div
              key={item.id ?? index}
              ref={(el) => {
                if (!item.id) return
                if (el) rowRefs.current.set(item.id, el)
                else rowRefs.current.delete(item.id)
              }}
              className="flex flex-col gap-1"
            >
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
      </CardContent>

      {(showTotals || footer) && (
        <CardContent className="-mt-1 flex shrink-0 flex-col gap-3">
          {showTotals && (
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
      )}
    </Card>
  )
}
