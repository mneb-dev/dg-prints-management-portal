import { DotBadge } from "@/components/dot-badge"
import type { PaymentStatus } from "@/lib/orders"

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
  pending_release: "Pending release",
  awaiting_payment: "Awaiting payment",
}

// Neutral chip + dot like every other status chip. Released reads teal (done), pending release gold
// (money is with the shop, waiting on admin action), and awaiting payment a quiet grey — no action
// is available yet, so it shouldn't compete with rows that have one.
const STATUS_DOTS: Record<CommissionReleaseStatus, string> = {
  released: "bg-order-status-teal",
  pending_release: "bg-order-status-gold",
  awaiting_payment: "bg-muted-foreground/40",
}

export function CommissionReleaseBadge({ status }: { status: CommissionReleaseStatus }) {
  return <DotBadge dotClassName={STATUS_DOTS[status]}>{STATUS_LABELS[status]}</DotBadge>
}

export { STATUS_LABELS as COMMISSION_RELEASE_STATUS_LABELS }
