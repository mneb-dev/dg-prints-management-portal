import { ChevronDownIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { perUnitDisplayDimensions } from "@/lib/order-line-item"
import type { OrderItem } from "@/lib/orders"
import { scaleQuotation } from "@/lib/sticker-quotation"
import { formatCurrency } from "@/lib/utils"

/** The item's physical dimensions, when it has any — "General Merchandise" items (bag tags, etc.)
 * don't carry a size, everything else (stickers, tarpaulin, boards, 3D prints) does. */
function itemSizeLabel(item: OrderItem): string | null {
  if (item.productCategory === "General Merchandise") return null

  const pricing = item.pricing
  if (pricing.pricingType === "Package") {
    const size = pricing.size ?? item.stickerQuotation
    return size ? `${size.width} × ${size.height} ${size.unit}` : null
  }
  if (pricing.pricingType === "Per Unit") {
    const dimensions = perUnitDisplayDimensions(pricing)
    if (dimensions) return `${dimensions.width} × ${dimensions.height} ${dimensions.unit}`
  }
  if (pricing.pricingType === "Custom" && pricing.width && pricing.height) {
    return `${pricing.width} × ${pricing.height} in`
  }
  return null
}

/** One line item on the order details page's Product card. Header stays compact (name, category,
 * size, quantity, amount) so an order with many items across different categories still scans at
 * a glance; the option/quotation/notes breakdown sits behind a collapsible so it doesn't turn the
 * card into a wall of near-identical rows. */
export function OrderItemSummary({
  item,
  index,
  showIndex,
  defaultOpen,
}: {
  item: OrderItem
  index: number
  showIndex: boolean
  defaultOpen: boolean
}) {
  const packageSize =
    item.pricing.pricingType === "Package" ? (item.pricing.size ?? item.stickerQuotation) : null
  const perUnitDimensions = perUnitDisplayDimensions(item.pricing)
  const totalQuotation = item.stickerQuotation ? scaleQuotation(item.stickerQuotation, item.quantity) : null
  const sizeLabel = itemSizeLabel(item)

  return (
    // Rows are divided by the parent list (divide-y); the toggle, chevron chip and height/fade
    // animation match the order form's item cards so View and Edit move the same way.
    <Collapsible defaultOpen={defaultOpen} className="py-3 first:pt-0 last:pb-0">
      <CollapsibleTrigger className="group/toggle -mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left outline-none transition-colors duration-200 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            {showIndex && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">#{index + 1}</span>}
            <span className="truncate font-medium">{item.productName}</span>
            {sizeLabel && <Badge variant="secondary">{sizeLabel}</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">
            {item.productCategory} · Qty {item.quantity}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</span>
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-[background-color,color,rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/toggle:bg-accent group-hover/toggle:text-accent-foreground group-data-[panel-open]/toggle:rotate-180 motion-reduce:transition-colors"
          >
            <ChevronDownIcon className="size-4" />
          </span>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="group/panel h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
      {/* Details as a two-column label/value list; each row's wrapper is `contents` so labels and
          values line up in one grid. */}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 pt-3 text-sm transition-[opacity,translate] duration-300 ease-out group-data-[ending-style]/panel:-translate-y-1 group-data-[ending-style]/panel:opacity-0 group-data-[starting-style]/panel:-translate-y-1 group-data-[starting-style]/panel:opacity-0 motion-reduce:transition-none">
        {item.selectedOptions.map((option) => (
          <div key={option.optionId} className="contents">
            <dt className="text-muted-foreground">{option.optionName}</dt>
            <dd>{option.value}</dd>
          </div>
        ))}

        {item.pricing.pricingType === "Package" && (
          <div className="contents">
            <dt className="text-muted-foreground">Package</dt>
            <dd>{item.pricing.packageName}</dd>
          </div>
        )}

        {item.pricing.pricingType === "Package" && packageSize && (
          <div className="contents">
            <dt className="text-muted-foreground">Size</dt>
            <dd>
              {packageSize.width} × {packageSize.height} {packageSize.unit}
            </dd>
          </div>
        )}
        {perUnitDimensions && (
          <div className="contents">
            <dt className="text-muted-foreground">Size</dt>
            <dd>
              {perUnitDimensions.width} × {perUnitDimensions.height} {perUnitDimensions.unit}
            </dd>
          </div>
        )}

        {item.pricing.pricingType === "Custom" && (
          <div className="contents">
            <dt className="text-muted-foreground">Custom Size</dt>
            <dd>{item.pricing.packageName}</dd>
          </div>
        )}
        {item.pricing.pricingType === "Custom" && (
          <div className="contents">
            <dt className="text-muted-foreground">Size</dt>
            <dd>
              {item.pricing.width} × {item.pricing.height} in
            </dd>
          </div>
        )}

        {item.stickerQuotation && (
          <div className="contents">
            <dt className="text-muted-foreground">{item.productCategory} Quotation</dt>
            <dd>
              {item.stickerQuotation.quantity} pcs
              {item.stickerQuotation.free ? ` + ${item.stickerQuotation.free} pcs free` : ""}
            </dd>
          </div>
        )}

        {totalQuotation && (
          <div className="contents">
            <dt className="text-muted-foreground">Total to receive</dt>
            <dd>
              {totalQuotation.quantity} pcs
              {totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : ""}
            </dd>
          </div>
        )}

        {item.notes && (
          <div className="contents">
            <dt className="text-muted-foreground">Notes</dt>
            <dd>{item.notes}</dd>
          </div>
        )}
      </dl>
      </CollapsibleContent>
    </Collapsible>
  )
}
