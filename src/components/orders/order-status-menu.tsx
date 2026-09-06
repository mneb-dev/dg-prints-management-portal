import { ChevronDownIcon, Loader2Icon } from "lucide-react"

import { badgeVariants } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCategories } from "@/lib/categories"
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
  onReturn,
  onOptimisticChange,
  size = "sm",
}: {
  order: Order
  onCancel: (order: Order) => void
  onRefund: (order: Order) => void
  onReturn: (order: Order) => void
  onOptimisticChange?: (status: OrderStatus | null) => void
  size?: "sm" | "lg"
}) {
  const { updateStatus, isUpdating } = useOrderStatusUpdate()
  const { categories } = useCategories()
  const options = getOrderStatusOptions(order, categories)
  const Icon = ORDER_STATUS_ICONS[order.status]

  async function handleSelect(status: OrderStatus) {
    if (status === order.status || isUpdating) return
    if (status === "cancelled") return onCancel(order)
    if (status === "refunded") return onRefund(order)
    if (status === "returned") return onReturn(order)
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
        {ORDER_STATUS_LABELS[order.status]}
        <ChevronDownIcon className={cn("opacity-70", size === "lg" ? "size-4" : "size-3")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => {
          const OptionIcon = ORDER_STATUS_ICONS[option.value]
          const isCurrent = option.value === order.status
          return (
            <DropdownMenuItem
              key={option.value}
              disabled={option.disabled || isCurrent}
              variant={
                option.value === "cancelled" ||
                option.value === "refunded" ||
                option.value === "returned"
                  ? "destructive"
                  : "default"
              }
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
