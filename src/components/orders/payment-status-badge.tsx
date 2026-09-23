import { Badge } from "@/components/ui/badge"
import type { PaymentStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partial",
  paid: "Paid",
  refunded: "Refunded",
}

/** Single source of truth for each payment status's dot color — edit here to retune a status.
 * Payment chips follow the design system's "neutral chrome + a dot" rule (docs/design-system.md),
 * so this dot (rendered by `PaymentStatusDot` in the badge, `PaymentStatusMenu`, and
 * `PaymentFields`) is the only place a payment status carries color.
 *
 * Colors come from the brand-tuned order-status palette and mirror the chart palette that pairs
 * with the indigo primary: teal (done), violet (in progress, the brand's secondary hue), gold
 * (needs collecting — warm, but softer than a warning amber) and rose (money returned — distinct
 * without reading as an app error). Four well-separated hues, so the dots stay easy to tell apart. */
const STATUS_DOT_CLASSES: Record<PaymentStatus, string> = {
  unpaid: "bg-order-status-gold",
  partially_paid: "bg-order-status-violet",
  paid: "bg-order-status-teal",
  refunded: "bg-order-status-rose",
}

/** The colored dot every payment chip/menu item leads with. */
function PaymentStatusDot({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 translate-y-px rounded-full", STATUS_DOT_CLASSES[status], className)}
    />
  )
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus
  className?: string
}) {
  return (
    <Badge variant="secondary" className={cn("justify-start border-transparent", className)}>
      <PaymentStatusDot status={status} />
      <span className="leading-none">{STATUS_LABELS[status]}</span>
    </Badge>
  )
}

export { PaymentStatusDot }
export { STATUS_LABELS as PAYMENT_STATUS_LABELS }
