import { Badge } from "@/components/ui/badge"
import { useOrderStatusLookup } from "@/lib/order-statuses"
import { CURING_STATUS_NAME, formatCuringDuration } from "@/lib/order-status"
import type { OrderStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

/** Read-only order status chip — the same neutral chrome + status dot as `OrderStatusMenu`'s
 * trigger (docs/design-system.md), so a status looks identical whether or not the viewer can
 * change it. */
export function OrderStatusBadge({
  status,
  statusUpdatedAt,
  className,
}: {
  status: OrderStatus
  /** When the order entered `status` — pass `order.statusUpdatedAt` so a Curing badge can
   * show elapsed time ("Curing + 3h"). Statuses other than Curing ignore this. Omit entirely
   * to always suppress the duration (e.g. the orders table, which has its own "last update"
   * column right next to this badge). */
  statusUpdatedAt?: string | null
  className?: string
}) {
  const { getLabel, getColors } = useOrderStatusLookup()
  const duration =
    status === CURING_STATUS_NAME ? formatCuringDuration(statusUpdatedAt ?? null) : null

  return (
    <Badge
      variant="secondary"
      className={cn(
        "justify-start border-transparent animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
    >
      <span
        aria-hidden
        className={cn("size-2 shrink-0 translate-y-px rounded-full", getColors(status).solid)}
      />
      <span className="leading-none">
        {getLabel(status)}
        {duration && ` ${duration}`}
      </span>
    </Badge>
  )
}
