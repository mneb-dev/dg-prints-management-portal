import { CircleDollarSignIcon, ClockIcon, HandCoinsIcon, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { PaymentStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

export type CommissionReleaseStatus = "released" | "pending_release" | "awaiting_payment"

/** Paid + released -> released. Paid + not yet released -> pending_release (money is with the
 * shop, waiting on admin action). Anything else (unpaid/partially paid/refunded) -> awaiting
 * payment -- release isn't applicable yet, distinct from "pending release". */
export function getCommissionReleaseStatus(
  paymentStatus: PaymentStatus,
  releasedAt: string | null
): CommissionReleaseStatus {
  if (paymentStatus !== "paid") return "awaiting_payment"
  return releasedAt ? "released" : "pending_release"
}

const STATUS_LABELS: Record<CommissionReleaseStatus, string> = {
  released: "Released",
  pending_release: "Pending Release",
  awaiting_payment: "Awaiting Payment",
}

// released reuses HandCoinsIcon -- same glyph as the sidebar's Commissions nav icon, same
// underlying concept ("money handed to staff"). pending_release is reserved exclusively for
// "money is with the shop, waiting on admin action" -- never reused for "waiting on the
// customer" (that's awaiting_payment, which intentionally reuses PaymentStatusBadge's "unpaid"
// glyph since it's the same concept viewed from the commission side).
const STATUS_ICONS: Record<CommissionReleaseStatus, LucideIcon> = {
  released: HandCoinsIcon,
  pending_release: ClockIcon,
  awaiting_payment: CircleDollarSignIcon,
}

const STATUS_COLORS: Record<CommissionReleaseStatus, string> = {
  released: "bg-status-success/10 text-status-success dark:bg-status-success/20",
  pending_release: "bg-status-warning/10 text-status-warning dark:bg-status-warning/20",
  // Deliberately quieter than the actionable "Pending Release" amber -- this state has no
  // available action, so it shouldn't compete visually with rows that do.
  awaiting_payment: "bg-secondary text-secondary-foreground",
}

export function CommissionReleaseBadge({ status }: { status: CommissionReleaseStatus }) {
  const Icon = STATUS_ICONS[status]
  return (
    <Badge variant="plain" className={cn(STATUS_COLORS[status], "border-transparent")}>
      <Icon data-icon="inline-start" />
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export { STATUS_LABELS as COMMISSION_RELEASE_STATUS_LABELS }
