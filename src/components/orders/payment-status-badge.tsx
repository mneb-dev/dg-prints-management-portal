import { Badge } from "@/components/ui/badge"
import type { PaymentStatus } from "@/lib/orders"

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
}

const STATUS_VARIANTS: Record<PaymentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  unpaid: "destructive",
  partially_paid: "secondary",
  paid: "default",
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}

export { STATUS_LABELS as PAYMENT_STATUS_LABELS }
