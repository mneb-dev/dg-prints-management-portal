import { Fragment } from "react"
import { ChevronDownIcon, Loader2Icon } from "lucide-react"

import { badgeVariants } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PAYMENT_STATUSES, usePaymentStatusUpdate } from "@/lib/orders"
import type { Order, PaymentStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

import { PAYMENT_STATUS_LABELS, PaymentStatusDot } from "./payment-status-badge"

/** Compact, click-to-change payment control for the orders table row — same trigger/menu shape
 * as `OrderStatusMenu` (neutral chrome + status dot). `unpaid` commits instantly. `paid` and
 * `partially_paid` always hand off to `onRequestPayment` so the caller can open
 * `RecordPaymentDialog` and let the user confirm or change the method (and amount, for
 * `partially_paid`) first — never an instant, silent commit. */
export function PaymentStatusMenu({
  order,
  onRequestPayment,
  size = "sm",
  triggerClassName,
}: {
  order: Order
  onRequestPayment: (order: Order, targetStatus: "paid" | "partially_paid") => void
  size?: "sm" | "lg"
  /** Extra classes for the trigger button — e.g. a fixed width so the column doesn't reflow
   * as the status changes. Left unset, the trigger stays `w-fit` (badgeVariants' default). */
  triggerClassName?: string
}) {
  const { updatePayment, isUpdating } = usePaymentStatusUpdate()

  async function handleSelect(status: PaymentStatus) {
    if (status === order.payment.status || isUpdating) return

    if (status === "unpaid") {
      await updatePayment(order, { status: "unpaid", method: null, downPayment: 0, balance: order.total })
      return
    }

    if (status === "refunded") {
      await updatePayment(order, { status: "refunded", method: null, downPayment: 0, balance: 0 })
      return
    }

    onRequestPayment(order, status)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isUpdating}
        render={
          <button
            type="button"
            className={cn(
              badgeVariants({ variant: "secondary" }),
              "justify-start border-transparent cursor-pointer pr-1.5 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60",
              size === "lg" && "h-8 gap-1.5 px-3 text-sm [&>svg]:size-4!",
              triggerClassName
            )}
          />
        }
      >
        {isUpdating ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <PaymentStatusDot status={order.payment.status} />
        )}
        <span className="leading-none">{PAYMENT_STATUS_LABELS[order.payment.status]}</span>
        <ChevronDownIcon className={cn("ml-auto opacity-70", size === "lg" ? "size-4" : "size-3")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PAYMENT_STATUSES.map((status) => (
          <Fragment key={status}>
            {status === "refunded" && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={status === order.payment.status}
              onClick={() => void handleSelect(status)}
            >
              <PaymentStatusDot status={status} />
              <span className="leading-none">{PAYMENT_STATUS_LABELS[status]}</span>
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
