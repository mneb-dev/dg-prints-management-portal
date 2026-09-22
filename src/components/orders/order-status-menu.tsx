import { useState } from "react"
import { ChevronDownIcon, HourglassIcon, Loader2Icon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { badgeVariants } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { TickingText } from "@/components/ticking-text"
import { useCategories } from "@/lib/categories"
import { useActiveOrderStatuses, useOrderStatusLookup } from "@/lib/order-statuses"
import {
  CURING_STATUS_NAME,
  formatCuringDuration,
  getOrderStatusOptions,
  useOrderStatusUpdate,
} from "@/lib/orders"
import type { Order, OrderStatus } from "@/lib/orders"
import type { Role } from "@/lib/users"
import { cn } from "@/lib/utils"

/** Compact, click-to-change status control for the orders table row. Trigger matches the
 * read-only `OrderStatusBadge` it replaces (same size/color) so the column doesn't get wider —
 * only a chevron is added. `cancelled`/`refunded`/`returned` route to the existing confirmation
 * dialogs instead of committing directly; leaving `curing` for any other status shows an inline
 * confirmation warning that the curing time will reset. */
export function OrderStatusMenu({
  order,
  onCancel,
  onRefund,
  onReturn,
  onOptimisticChange,
  size = "sm",
  role,
  triggerClassName,
}: {
  order: Order
  onCancel: (order: Order) => void
  onRefund: (order: Order) => void
  onReturn: (order: Order) => void
  onOptimisticChange?: (status: OrderStatus | null) => void
  size?: "sm" | "lg"
  role?: Role | null
  /** Extra classes for the trigger button — e.g. a fixed width so the column doesn't reflow
   * as the status changes. Left unset, the trigger stays `w-fit` (badgeVariants' default). */
  triggerClassName?: string
}) {
  const { updateStatus, isUpdating } = useOrderStatusUpdate()
  const { categories } = useCategories()
  const { statuses } = useActiveOrderStatuses()
  const { getLabel, getColors } = useOrderStatusLookup()
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)

  const isCuring = order.status === CURING_STATUS_NAME

  const options = getOrderStatusOptions(
    order,
    categories,
    role,
    statuses.map((s) => s.name)
  )
  // Ticks independently every 30s (see TickingText) instead of driving this whole menu's
  // re-render off a timer -- curingDuration itself is only used for the confirm-dialog copy
  // below, which doesn't need to tick.
  const curingDuration = isCuring ? formatCuringDuration(order.statusUpdatedAt) : null

  async function commitStatus(status: OrderStatus) {
    onOptimisticChange?.(status)
    await updateStatus(order, status)
    onOptimisticChange?.(null)
  }

  async function handleSelect(status: OrderStatus) {
    if (status === order.status || isUpdating) return
    if (status === "cancelled") return onCancel(order)
    if (status === "refunded") return onRefund(order)
    if (status === "returned") return onReturn(order)
    if (order.status === CURING_STATUS_NAME) {
      setPendingStatus(status)
      return
    }
    await commitStatus(status)
  }

  async function handleConfirmCuringExit() {
    if (!pendingStatus) return
    const status = pendingStatus
    setPendingStatus(null)
    await commitStatus(status)
  }

  return (
    <>
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
            <span
              aria-hidden
              className={cn("size-2 shrink-0 translate-y-px rounded-full", getColors(order.status).solid)}
            />
          )}
          <span className="leading-none">
            {getLabel(order.status)}
            {isCuring && (
              <TickingText
                intervalMs={30_000}
                format={() => {
                  const duration = formatCuringDuration(order.statusUpdatedAt)
                  return duration ? ` ${duration}` : null
                }}
              />
            )}
          </span>
          <ChevronDownIcon
            className={cn("ml-auto opacity-70", size === "lg" ? "size-4" : "size-3")}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {options.map((option) => {
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
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 translate-y-px rounded-full",
                    getColors(option.value).solid
                  )}
                />
                <span className="leading-none">{getLabel(option.value)}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-status-warning/10 text-status-warning">
              <HourglassIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Change status?</AlertDialogTitle>
            <AlertDialogDescription>
              Change this order from {getLabel(CURING_STATUS_NAME)}
              {curingDuration && ` (${curingDuration})`} to{" "}
              <span className="font-medium text-foreground">
                {pendingStatus && getLabel(pendingStatus)}
              </span>
              ? The curing time will reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isUpdating} onClick={() => void handleConfirmCuringExit()}>
              {isUpdating && <Spinner data-icon="inline-start" />}
              {isUpdating ? "Changing..." : "Change Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
