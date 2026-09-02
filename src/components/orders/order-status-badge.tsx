import {
  CheckCircle2Icon,
  ClockIcon,
  type LucideIcon,
  PackageIcon,
  PencilRulerIcon,
  PenToolIcon,
  PrinterIcon,
  RotateCcwIcon,
  ScissorsIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react"

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

const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
  pending: ClockIcon,
  layout: PencilRulerIcon,
  trace: PenToolIcon,
  print: PrinterIcon,
  cut: ScissorsIcon,
  pack: PackageIcon,
  pickup: TruckIcon,
  released: CheckCircle2Icon,
  cancelled: XCircleIcon,
  refunded: RotateCcwIcon,
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICONS[status]
  return (
    <Badge
      variant={STATUS_VARIANTS[status]}
      className="animate-in fade-in-0 zoom-in-95 duration-200"
    >
      <Icon data-icon="inline-start" />
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export { STATUS_LABELS as ORDER_STATUS_LABELS }
export { STATUS_VARIANTS as ORDER_STATUS_VARIANTS, STATUS_ICONS as ORDER_STATUS_ICONS }
