import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/lib/orders"

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  layout: "To Layout",
  trace: "To Trace",
  print: "To Print",
  cut: "To Cut",
  pack: "To Pack",
  pickup: "To Pick-up",
  released: "Released",
  cancelled: "Cancelled",
  refunded: "Refunded",
}

const STATUS_VARIANTS: Record<
  OrderStatus,
  "secondary" | "info" | "progress" | "ready" | "success" | "destructive"
> = {
  pending: "secondary",
  layout: "info",
  trace: "info",
  print: "progress",
  cut: "progress",
  pack: "progress",
  pickup: "ready",
  released: "success",
  cancelled: "destructive",
  refunded: "destructive",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}

export { STATUS_LABELS as ORDER_STATUS_LABELS }
