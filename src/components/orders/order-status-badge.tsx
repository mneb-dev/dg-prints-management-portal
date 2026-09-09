import { Badge } from "@/components/ui/badge"
import { useOrderStatusLookup } from "@/lib/order-statuses"
import { CURING_STATUS_NAME, formatCuringDuration } from "@/lib/order-status"
import type { OrderStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

export function OrderStatusBadge({
  status,
  statusUpdatedAt,
}: {
  status: OrderStatus
  /** When the order entered `status` — pass `order.statusUpdatedAt` so a Curing badge can
   * show elapsed time ("Curing + 3h"). Statuses other than Curing ignore this. */
  statusUpdatedAt?: string | null
}) {
  const { getLabel, getIcon, getColors } = useOrderStatusLookup()
  const Icon = getIcon(status)
  const duration =
    status === CURING_STATUS_NAME ? formatCuringDuration(statusUpdatedAt ?? null) : null

  return (
    <Badge
      variant="plain"
      className={cn(
        getColors(status).badge,
        "border-transparent animate-in fade-in-0 zoom-in-95 duration-200"
      )}
    >
      <Icon data-icon="inline-start" />
      {getLabel(status)}
      {duration && ` ${duration}`}
    </Badge>
  )
}
