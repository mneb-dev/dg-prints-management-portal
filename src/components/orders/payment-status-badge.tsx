import {
  BadgeCheckIcon,
  CircleDollarSignIcon,
  CoinsIcon,
  type LucideIcon,
  RotateCcwIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { PaymentStatus } from "@/lib/orders"

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  refunded: "Refunded",
}

const STATUS_VARIANTS: Record<PaymentStatus, "warning" | "secondary" | "info" | "destructive"> = {
  unpaid: "warning",
  partially_paid: "secondary",
  paid: "info",
  refunded: "destructive",
}

const STATUS_ICONS: Record<PaymentStatus, LucideIcon> = {
  unpaid: CircleDollarSignIcon,
  partially_paid: CoinsIcon,
  paid: BadgeCheckIcon,
  refunded: RotateCcwIcon,
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const Icon = STATUS_ICONS[status]
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      <Icon data-icon="inline-start" />
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export { STATUS_LABELS as PAYMENT_STATUS_LABELS }
export { STATUS_VARIANTS as PAYMENT_STATUS_VARIANTS, STATUS_ICONS as PAYMENT_STATUS_ICONS }
