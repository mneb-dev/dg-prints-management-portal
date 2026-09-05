import { badgeVariants } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getOrderWorkflowStatuses, isTerminalStatus } from "@/lib/orders"
import type { Order, OrderStatus } from "@/lib/orders"
import { cn, formatDate, formatRelativeDate } from "@/lib/utils"

import { ORDER_STATUS_ICONS, ORDER_STATUS_LABELS, ORDER_STATUS_VARIANTS } from "./order-status-badge"

type StatusVariant = "secondary" | "info" | "progress" | "ready" | "success" | "destructive"

// Solid bar fill per variant, for the connector line only — badgeVariants' bg-*/10
// classes are for translucent pill/icon-chip backgrounds and read too faint as a solid bar.
const CONNECTOR_ACCENT_CLASS: Record<StatusVariant, string> = {
  secondary: "bg-border",
  info: "bg-status-info",
  progress: "bg-status-progress",
  ready: "bg-status-ready",
  success: "bg-status-success",
  destructive: "bg-destructive",
}

const ENTRANCE_ANIMATION =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"

/** Icon + label + "on {date} by {name}" — used both for a terminal (cancelled/refunded)
 * status and as a fallback when the current status can't be placed on the workflow track
 * (e.g. the order's item has no category, or its category's flow doesn't include the
 * status the order is actually in). Showing this instead of a step track with nothing
 * highlighted keeps the component honest about what it can and can't display. */
function StatusSummary({ order, status }: { order: Order; status: OrderStatus }) {
  const Icon = ORDER_STATUS_ICONS[status]
  const variant = ORDER_STATUS_VARIANTS[status]
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span
        className={cn(
          badgeVariants({ variant }),
          "size-10 shrink-0 rounded-full p-0 [&>svg]:size-5!",
          ENTRANCE_ANIMATION
        )}
      >
        <Icon />
      </span>
      <div className="flex flex-col">
        <span className="font-medium">{ORDER_STATUS_LABELS[status]}</span>
        {order.statusUpdatedAt && (
          <span className="text-sm text-muted-foreground">
            on{" "}
            <Tooltip>
              <TooltipTrigger
                render={<button type="button" className="cursor-default font-medium text-foreground" />}
              >
                {formatRelativeDate(order.statusUpdatedAt)}
              </TooltipTrigger>
              <TooltipContent>{formatDate(order.statusUpdatedAt)}</TooltipContent>
            </Tooltip>{" "}
            by {order.statusUpdatedByName || "Unknown user"}
          </span>
        )}
      </div>
    </div>
  )
}

/** Read-only visualization of an order's position in its category's status workflow.
 * Purely a display — status changes still happen through `OrderStatusMenu` elsewhere on
 * the page. Renders a vertical list below `lg` (matches this page's own mobile/desktop
 * split) and a horizontal track at `lg` and up, since a horizontal track can't show every
 * step of an 8-step flow at once on a phone-width screen. */
export function OrderStatusStepper({ order }: { order: Order }) {
  if (isTerminalStatus(order.status)) {
    return <StatusSummary order={order} status={order.status} />
  }

  const workflowStatuses = getOrderWorkflowStatuses(order)
  const currentIndex = workflowStatuses.indexOf(order.status)

  // The order's current status isn't part of its derived workflow (e.g. missing/unmapped
  // product category data) — there's no sensible position to highlight on the track, so
  // fall back to the same plain summary rather than rendering every step unhighlighted.
  if (currentIndex === -1) {
    return <StatusSummary order={order} status={order.status} />
  }

  const currentVariant = ORDER_STATUS_VARIANTS[order.status]

  return (
    <>
      {/* Mobile: vertical list, every label always visible, 44px touch targets. A
          horizontal track can only show 2-3 of up to 8 steps at once on a phone-width
          screen, and a sideways scroll gesture inside a small region isn't discoverable
          on touch — effectively hiding steps. Vertical reuses the page's existing
          vertical-scroll affordance instead. */}
      <div className="flex flex-col lg:hidden">
        {workflowStatuses.map((status, i) => {
          const isCurrent = i === currentIndex
          const isReached = i <= currentIndex
          const variant = isReached ? currentVariant : "secondary"
          const Icon = ORDER_STATUS_ICONS[status]
          const isLast = i === workflowStatuses.length - 1

          return (
            <div key={status} className={cn("flex gap-3", !isLast && "pb-6")}>
              <div className="flex flex-col items-center">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className={cn(
                          badgeVariants({ variant }),
                          "size-11 shrink-0 rounded-full p-0 cursor-default [&>svg]:size-5!",
                          isCurrent && ENTRANCE_ANIMATION
                        )}
                      />
                    }
                  >
                    <Icon />
                    <span className="sr-only">{ORDER_STATUS_LABELS[status]}</span>
                  </TooltipTrigger>
                  <TooltipContent>{ORDER_STATUS_LABELS[status]}</TooltipContent>
                </Tooltip>
                {!isLast && (
                  <div
                    className={cn(
                      "min-h-6 w-0.5 flex-1",
                      i < currentIndex ? CONNECTOR_ACCENT_CLASS[currentVariant] : "bg-border"
                    )}
                  />
                )}
              </div>
              <div className="flex flex-col justify-center pt-1.5">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {ORDER_STATUS_LABELS[status]}
                </span>
                {isCurrent && order.statusUpdatedAt && (
                  <span className="text-xs text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger
                        render={<button type="button" className="cursor-default font-medium" />}
                      >
                        {formatRelativeDate(order.statusUpdatedAt)}
                      </TooltipTrigger>
                      <TooltipContent>{formatDate(order.statusUpdatedAt)}</TooltipContent>
                    </Tooltip>{" "}
                    by {order.statusUpdatedByName || "Unknown user"}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: horizontal track. Connectors grow (flex-1) so the track always spans
          the full card width instead of clumping to the left on a wide page — only the
          chip columns stay fixed-size. overflow-x-auto is a defensive fallback only — at
          lg's 1024px minimum width, even an 8-step flow fits without scrolling. */}
      <div className="hidden items-center lg:flex lg:overflow-x-auto lg:pb-1">
        {workflowStatuses.map((status, i) => {
          const isCurrent = i === currentIndex
          const isReached = i <= currentIndex
          const variant = isReached ? currentVariant : "secondary"
          const Icon = ORDER_STATUS_ICONS[status]
          const isLast = i === workflowStatuses.length - 1

          return (
            <div key={status} className={cn("flex items-center", isLast ? "shrink-0" : "flex-1")}>
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className={cn(
                          badgeVariants({ variant }),
                          "size-9 shrink-0 rounded-full p-0 cursor-default [&>svg]:size-4!",
                          isCurrent && ENTRANCE_ANIMATION
                        )}
                      />
                    }
                  >
                    <Icon />
                    <span className="sr-only">{ORDER_STATUS_LABELS[status]}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {ORDER_STATUS_LABELS[status]}
                    {isCurrent && order.statusUpdatedAt && (
                      <div className="text-background/70">
                        {formatDate(order.statusUpdatedAt)} ·{" "}
                        {order.statusUpdatedByName || "Unknown user"}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
                <span
                  className={cn(
                    "h-4 text-xs font-medium whitespace-nowrap",
                    !isCurrent && "invisible"
                  )}
                >
                  {ORDER_STATUS_LABELS[status]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 min-w-8 flex-1",
                    i < currentIndex ? CONNECTOR_ACCENT_CLASS[currentVariant] : "bg-border"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
