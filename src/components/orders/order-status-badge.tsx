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
  Undo2Icon,
  XCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

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
  returned: "Returned",
}

/** Single source of truth for each order status's color — one row per status, edit here to
 * retune any status's color. `badge` is the translucent pill bg+text used by `OrderStatusBadge`,
 * `OrderStatusMenu`'s trigger, `OrderStatusStepper`'s chips, and the dashboard `StatCard` icon
 * chips; `solid` is the solid fill used for the stepper's connector line; `ring` is the
 * dashboard `StatCard`'s hover ring; `color` is a `var()` reference for the dashboard pipeline
 * bar chart's `fill` and for tinting an option's icon/text wherever a status appears in a
 * dropdown or select list. `pending`/`released` intentionally reuse the same classes as the old
 * `secondary`/`success` badge variants so their appearance doesn't change. */
const STATUS_COLORS: Record<
  OrderStatus,
  { badge: string; solid: string; ring: string; color: string }
> = {
  pending: {
    badge: "bg-secondary text-secondary-foreground",
    solid: "bg-border",
    ring: "group-hover/statcard:ring-foreground/15",
    color: "var(--color-muted-foreground)",
  },
  layout: {
    badge: "bg-status-info/10 text-status-info dark:bg-status-info/20",
    solid: "bg-status-info",
    ring: "group-hover/statcard:ring-status-info/30",
    color: "var(--color-status-info)",
  },
  trace: {
    badge: "bg-order-status-trace/10 text-order-status-trace dark:bg-order-status-trace/20",
    solid: "bg-order-status-trace",
    ring: "group-hover/statcard:ring-order-status-trace/30",
    color: "var(--color-order-status-trace)",
  },
  print: {
    badge: "bg-status-progress/10 text-status-progress dark:bg-status-progress/20",
    solid: "bg-status-progress",
    ring: "group-hover/statcard:ring-status-progress/30",
    color: "var(--color-status-progress)",
  },
  cut: {
    badge: "bg-order-status-cut/10 text-order-status-cut dark:bg-order-status-cut/20",
    solid: "bg-order-status-cut",
    ring: "group-hover/statcard:ring-order-status-cut/30",
    color: "var(--color-order-status-cut)",
  },
  pack: {
    badge: "bg-order-status-pack/10 text-order-status-pack dark:bg-order-status-pack/20",
    solid: "bg-order-status-pack",
    ring: "group-hover/statcard:ring-order-status-pack/30",
    color: "var(--color-order-status-pack)",
  },
  pickup: {
    badge: "bg-status-ready/10 text-status-ready dark:bg-status-ready/20",
    solid: "bg-status-ready",
    ring: "group-hover/statcard:ring-status-ready/30",
    color: "var(--color-status-ready)",
  },
  released: {
    badge: "bg-status-success/10 text-status-success dark:bg-status-success/20",
    solid: "bg-status-success",
    ring: "group-hover/statcard:ring-status-success/30",
    color: "var(--color-status-success)",
  },
  cancelled: {
    badge: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    solid: "bg-destructive",
    ring: "group-hover/statcard:ring-destructive/30",
    color: "var(--color-destructive)",
  },
  refunded: {
    badge: "bg-order-status-refunded/10 text-order-status-refunded dark:bg-order-status-refunded/20",
    solid: "bg-order-status-refunded",
    ring: "group-hover/statcard:ring-order-status-refunded/30",
    color: "var(--color-order-status-refunded)",
  },
  returned: {
    badge: "bg-order-status-returned/10 text-order-status-returned dark:bg-order-status-returned/20",
    solid: "bg-order-status-returned",
    ring: "group-hover/statcard:ring-order-status-returned/30",
    color: "var(--color-order-status-returned)",
  },
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
  returned: Undo2Icon,
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICONS[status]
  return (
    <Badge
      variant="plain"
      className={cn(
        STATUS_COLORS[status].badge,
        "border-transparent animate-in fade-in-0 zoom-in-95 duration-200"
      )}
    >
      <Icon data-icon="inline-start" />
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export { STATUS_LABELS as ORDER_STATUS_LABELS }
export { STATUS_COLORS as ORDER_STATUS_COLORS, STATUS_ICONS as ORDER_STATUS_ICONS }
