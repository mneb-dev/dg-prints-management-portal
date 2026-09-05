import { ChevronDownIcon, Loader2Icon } from "lucide-react"

import { badgeVariants } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getOrderStatusOptions, useOrderStatusUpdate } from "@/lib/orders"
import type { Order, OrderStatus } from "@/lib/orders"
import { cn } from "@/lib/utils"

import { ORDER_STATUS_ICONS, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from "./order-status-badge"

/** Compact, click-to-change status control for the orders table row. Trigger matches the
 * read-only `OrderStatusBadge` it replaces (same size/color) so the column doesn't get wider —
 * only a chevron is added. `cancelled`/`refunded` route to the existing confirmation dialogs
 * instead of committing directly. */
export function OrderStatusMenu({
  order,
  onCancel,
  onRefund,
  onOptimisticChange,
}: {
  order: Order
  onCancel: (order: Order) => void
  onRefund: (order: Order) => void
  onOptimisticChange?: (status: OrderStatus | null) => void
}) {
  const { updateStatus, isUpdating } = useOrderStatusUpdate()
  const options = getOrderStatusOptions(order)
  const Icon = ORDER_STATUS_ICONS[order.status]

  async function handleSelect(status: OrderStatus) {
    if (status === order.status || isUpdating) return
    if (status === "cancelled") return onCancel(order)
    if (status === "refunded") return onRefund(order)
    onOptimisticChange?.(status)
    await updateStatus(order, status)
    onOptimisticChange?.(null)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isUpdating}
        render={
          <button
            type="button"
            className={cn(
              badgeVariants({ variant: ORDER_STATUS_VARIANTS[order.status] }),
              "cursor-pointer pr-1.5 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
            )}
          />
        }
      >
        {isUpdating ? (
          <Loader2Icon data-icon="inline-start" className="animate-spin" />
        ) : (
          <Icon data-icon="inline-start" />
        )}
        {ORDER_STATUS_LABELS[order.status]}
        <ChevronDownIcon className="size-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => {
          const OptionIcon = ORDER_STATUS_ICONS[option.value]
          const isCurrent = option.value === order.status
          return (
            <DropdownMenuItem
              key={option.value}
              disabled={option.disabled || isCurrent}
              variant={option.value === "cancelled" || option.value === "refunded" ? "destructive" : "default"}
              onClick={() => void handleSelect(option.value)}
            >
              <OptionIcon />
              {ORDER_STATUS_LABELS[option.value]}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
