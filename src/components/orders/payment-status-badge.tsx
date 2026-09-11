import {
  BadgeCheckIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  type LucideIcon,
  RotateCcwIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { PaymentStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partial",
  paid: "Paid",
  refunded: "Refunded",
}

/** Single source of truth for each payment status's color — one row per status, edit here to
 * retune any status's color. `badge` is the translucent pill bg+text used by `PaymentStatusBadge`,
 * `PaymentStatusMenu`'s trigger, and `PaymentFields`' trigger; `color` is a `var()` reference for
 * tinting an option's icon/text wherever a payment status appears in a dropdown or select list. */
const STATUS_COLORS: Record<PaymentStatus, { badge: string; color: string }> = {
  unpaid: {
    badge: "bg-status-warning/10 text-status-warning dark:bg-status-warning/20",
    color: "var(--color-status-warning)",
  },
  partially_paid: {
    badge: "bg-secondary text-secondary-foreground",
    color: "var(--color-muted-foreground)",
  },
  paid: {
    badge: "bg-status-info/10 text-status-info dark:bg-status-info/20",
    color: "var(--color-status-info)",
  },
  refunded: {
    badge: "bg-destructive/10 text-destructive dark:bg-destructive/20",
    color: "var(--color-destructive)",
  },
}

const STATUS_ICONS: Record<PaymentStatus, LucideIcon> = {
  unpaid: CircleDollarSignIcon,
  partially_paid: CoinsIcon,
  paid: BadgeCheckIcon,
  refunded: RotateCcwIcon,
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus
  className?: string
}) {
  const Icon = STATUS_ICONS[status]
  return (
    <Badge
      variant="plain"
      className={cn(STATUS_COLORS[status].badge, "border-transparent", className)}
    >
      <Icon data-icon="inline-start" />
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export { STATUS_LABELS as PAYMENT_STATUS_LABELS }
export { STATUS_COLORS as PAYMENT_STATUS_COLORS, STATUS_ICONS as PAYMENT_STATUS_ICONS }
