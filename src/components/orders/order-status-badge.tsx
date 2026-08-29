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

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  layout: "secondary",
  trace: "secondary",
  print: "default",
  cut: "default",
  pack: "default",
  pickup: "default",
  released: "outline",
  cancelled: "destructive",
  refunded: "destructive",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}

export { STATUS_LABELS as ORDER_STATUS_LABELS }
