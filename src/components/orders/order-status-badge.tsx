import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/lib/orders"

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
}

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  confirmed: "secondary",
  in_progress: "default",
  ready: "default",
  completed: "outline",
  cancelled: "destructive",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}

export { STATUS_LABELS as ORDER_STATUS_LABELS }
