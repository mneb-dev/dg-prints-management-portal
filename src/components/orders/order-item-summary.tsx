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
    <Collapsible defaultOpen={defaultOpen} className="rounded-lg border p-3">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 text-left">
        <div className="flex min-w-0 items-center gap-2">
          {showIndex && <span className="text-sm text-muted-foreground">Item {index + 1}</span>}
          <span className="truncate font-medium">{item.productName}</span>
          <Badge variant="outline">{item.productCategory}</Badge>
          {sizeLabel && <Badge variant="secondary">{sizeLabel}</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="text-muted-foreground">Qty {item.quantity}</span>
          <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="flex flex-col gap-1.5 pt-3 text-sm">
        {item.selectedOptions.map((option) => (
          <div key={option.optionId} className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">{option.optionName}:</span>
            <span>{option.value}</span>
          </div>
        ))}

        {item.pricing.pricingType === "Package" && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Package:</span>
            <span>{item.pricing.packageName}</span>
          </div>
        )}

        {item.pricing.pricingType === "Package" && packageSize && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Size:</span>
            <span>
              {packageSize.width} × {packageSize.height} {packageSize.unit}
            </span>
          </div>
        )}
        {perUnitDimensions && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Size:</span>
            <span>
              {perUnitDimensions.width} × {perUnitDimensions.height} {perUnitDimensions.unit}
            </span>
          </div>
        )}

        {item.pricing.pricingType === "Custom" && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Custom Size:</span>
            <span>{item.pricing.packageName}</span>
          </div>
        )}
        {item.pricing.pricingType === "Custom" && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Size:</span>
            <span>
              {item.pricing.width} × {item.pricing.height} in
            </span>
          </div>
        )}

        {item.stickerQuotation && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">{item.productCategory} Quotation:</span>
            <span>
              {item.stickerQuotation.quantity} pcs
              {item.stickerQuotation.free ? ` + ${item.stickerQuotation.free} pcs free` : ""}
            </span>
          </div>
        )}

        {totalQuotation && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Total to received:</span>
            <span>
              {totalQuotation.quantity} pcs
              {totalQuotation.free ? ` + ${totalQuotation.free} pcs free` : ""}
            </span>
          </div>
        )}

        {item.notes && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Notes:</span>
            <span>{item.notes}</span>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
