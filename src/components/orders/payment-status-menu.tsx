import { ChevronDownIcon, Loader2Icon } from "lucide-react"

import { badgeVariants } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PAYMENT_STATUSES, usePaymentStatusUpdate } from "@/lib/orders"
import type { Order, PaymentStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

import {
  PAYMENT_STATUS_ICONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANTS,
} from "./payment-status-badge"

/** Compact, click-to-change payment control for the orders table row — same trigger/menu shape
 * as `OrderStatusMenu`. `unpaid` commits instantly. `paid` and `partially_paid` always hand off
 * to `onRequestPayment` so the caller can open `RecordPaymentDialog` and let the user confirm or
 * change the method (and amount, for `partially_paid`) first — never an instant, silent commit. */
export function PaymentStatusMenu({
  order,
  onRequestPayment,
  size = "sm",
}: {
  order: Order
  onRequestPayment: (order: Order, targetStatus: "paid" | "partially_paid") => void
  size?: "sm" | "lg"
}) {
  const { updatePayment, isUpdating } = usePaymentStatusUpdate()
  const Icon = PAYMENT_STATUS_ICONS[order.payment.status]

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
              badgeVariants({ variant: PAYMENT_STATUS_VARIANTS[order.payment.status] }),
              "cursor-pointer pr-1.5 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60",
              size === "lg" && "h-8 gap-1.5 px-3 text-sm [&>svg]:size-4!"
            )}
          />
        }
      >
        {isUpdating ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" />
        ) : (
          <Icon data-icon="inline-start" />
        )}
        {PAYMENT_STATUS_LABELS[order.payment.status]}
        <ChevronDownIcon className={cn("opacity-70", size === "lg" ? "size-4" : "size-3")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PAYMENT_STATUSES.map((status) => {
          const OptionIcon = PAYMENT_STATUS_ICONS[status]
          const isCurrent = status === order.payment.status
          return (
            <DropdownMenuItem
              key={status}
              disabled={isCurrent}
              onClick={() => void handleSelect(status)}
            >
              <OptionIcon />
              {PAYMENT_STATUS_LABELS[status]}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
