import { useState, type CSSProperties } from "react"

import { RouteIcon } from "lucide-react"

import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { badgeVariants } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCategories } from "@/lib/categories"
import { useActiveOrderStatuses, useOrderStatusLookup } from "@/lib/order-statuses"
import {
  actorLabel,
  CURING_STATUS_NAME,
  formatCuringDuration,
  getOrderWorkflowStatuses,
  isTerminalStatus,
} from "@/lib/orders"
import type { Order, OrderStatus } from "@/lib/orders"
import { cn, formatDateTime, formatRelativeDate } from "@/lib/utils"

const ENTRANCE_ANIMATION =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"

/** Per-step stagger when the status moves: each connector fills (or empties) one after another,
 * so the change reads as the order travelling along its workflow rather than a jump-cut. */
const STEP_STAGGER_MS = 140
const CONNECTOR_TRANSITION =
  "transition-[width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
const CHIP_TRANSITION = "transition-colors duration-300 motion-reduce:transition-none"

/** Timing for one status change. Forward: connectors between the old and new step fill in order
 * and each step chip lights up as the fill reaches it. Backward: the same, in reverse. */
function stepTiming(fromIndex: number, toIndex: number) {
  const forward = toIndex >= fromIndex
  return {
    connectorDelay(i: number): number {
      if (fromIndex === toIndex) return 0
      if (forward) return i >= fromIndex && i < toIndex ? (i - fromIndex) * STEP_STAGGER_MS : 0
      return i >= toIndex && i < fromIndex ? (fromIndex - 1 - i) * STEP_STAGGER_MS : 0
    },
    chipDelay(i: number): number {
      if (fromIndex === toIndex) return 0
      if (forward) return i > fromIndex && i <= toIndex ? (i - fromIndex) * STEP_STAGGER_MS : 0
      return i > toIndex && i <= fromIndex ? (fromIndex - i) * STEP_STAGGER_MS : 0
    },
  }
}

/** A step chip's color change waits for the fill to reach it; the current chip's pop-in waits too. */
function chipStyle(delayMs: number, isCurrent: boolean): CSSProperties | undefined {
  if (delayMs === 0) return undefined
  return isCurrent
    ? { transitionDelay: `${delayMs}ms`, animationDelay: `${delayMs}ms`, animationFillMode: "both" }
    : { transitionDelay: `${delayMs}ms` }
}

/** One soft halo pulse on the step that just became current, timed to land after the fill. */
function ArrivalPulse({ pulseKey, delayMs, colorClass }: { pulseKey: number; delayMs: number; colorClass: string }) {
  if (pulseKey === 0) return null
  return (
    <span
      key={pulseKey}
      aria-hidden
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        "pointer-events-none absolute inset-0 rounded-full opacity-0 motion-safe:animate-ping [animation-fill-mode:both] [animation-iteration-count:1]",
        colorClass
      )}
    />
  )
}

/** "by Maria · 3h ago" with the full date on hover — the same wording and format as the View
 * Order page's Activity entries, so "who moved it, and when" reads identically in both places. */
function UpdatedBy({ order, withDot = false }: { order: Order; withDot?: boolean }) {
  if (!order.statusUpdatedAt) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {withDot && <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary ring-3 ring-primary/15" />}
      <span>
        Updated by {actorLabel(order.statusUpdatedByName, order)} ·{" "}
        <Tooltip>
          <TooltipTrigger
            render={<button type="button" className="cursor-default font-medium text-foreground" />}
          >
            {formatRelativeDate(order.statusUpdatedAt)}
          </TooltipTrigger>
          <TooltipContent>{formatDateTime(order.statusUpdatedAt)}</TooltipContent>
        </Tooltip>
      </span>
    </span>
  )
}

/** Card heading for the progress track: title + "Step 3 of 6 · Layout", and on the right the
 * activity-style "Updated by … · 3h ago". */
function ProgressHeader({
  order,
  description,
  hideUpdatedOnMobile = false,
}: {
  order: Order
  description: string
  /** On the step track, mobile shows who/when under the current step instead. */
  hideUpdatedOnMobile?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <OrderFormSectionHeader icon={RouteIcon} title="Order progress" description={description} />
      <span className={hideUpdatedOnMobile ? "hidden lg:inline-flex" : "inline-flex"}>
        <UpdatedBy order={order} withDot />
      </span>
    </div>
  )
}

/** Icon + label + "on {date} by {name}" — used both for a terminal (cancelled/refunded)
 * status and as a fallback when the current status can't be placed on the workflow track
 * (e.g. the order's item has no category, or its category's flow doesn't include the
 * status the order is actually in). Showing this instead of a step track with nothing
 * highlighted keeps the component honest about what it can and can't display. */
function StatusSummary({ order, status }: { order: Order; status: OrderStatus }) {
  const { getLabel, getIcon, getColors } = useOrderStatusLookup()
  const Icon = getIcon(status)
  const curingDuration =
    status === CURING_STATUS_NAME ? formatCuringDuration(order.statusUpdatedAt) : null
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
      <span
        className={cn(
          badgeVariants({ variant: "plain" }),
          getColors(status).badge,
          "border-transparent size-10 shrink-0 rounded-full p-0 [&>svg]:size-5!",
          ENTRANCE_ANIMATION
        )}
      >
        <Icon />
      </span>
      <div className="flex flex-col">
        <span className="font-medium">
          {getLabel(status)}
          {curingDuration && ` + ${curingDuration}`}
        </span>
        <UpdatedBy order={order} />
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
  const { categories } = useCategories()
  const { statuses } = useActiveOrderStatuses()
  const { getLabel, getIcon, getColors } = useOrderStatusLookup()

  const workflowStatuses = getOrderWorkflowStatuses(
    order,
    categories,
    statuses.map((s) => s.name)
  )
  const currentIndex = workflowStatuses.indexOf(order.status)

  // Track where the order was before its latest move, so a status change animates from the old
  // step to the new one. Uses React's "adjust state while rendering" pattern (no ref reads during
  // render): when the index changes, remember the old one and bump pulseKey to replay the
  // arrival pulse once.
  const [trackedIndex, setTrackedIndex] = useState(currentIndex)
  const [fromIndex, setFromIndex] = useState(currentIndex)
  const [pulseKey, setPulseKey] = useState(0)
  if (currentIndex !== trackedIndex) {
    setFromIndex(trackedIndex)
    setTrackedIndex(currentIndex)
    if (currentIndex !== -1 && trackedIndex !== -1) setPulseKey((key) => key + 1)
  }
  const timing = stepTiming(fromIndex === -1 ? currentIndex : fromIndex, currentIndex)
  const arrivalDelay = timing.chipDelay(currentIndex)

  if (isTerminalStatus(order.status)) {
    return (
      <div className="flex flex-col gap-5">
        <ProgressHeader order={order} description="This order is closed" />
        <StatusSummary order={order} status={order.status} />
      </div>
    )
  }

  function stepLabel(status: OrderStatus) {
    if (status !== CURING_STATUS_NAME || status !== order.status) return getLabel(status)
    return getLabel(status)
  }

  // The order's current status isn't part of its derived workflow (e.g. missing/unmapped
  // product category data) — there's no sensible position to highlight on the track, so
  // fall back to the same plain summary rather than rendering every step unhighlighted.
  if (currentIndex === -1) {
    return (
      <div className="flex flex-col gap-5">
        <ProgressHeader order={order} description={getLabel(order.status)} />
        <StatusSummary order={order} status={order.status} />
      </div>
    )
  }

  const currentColor = getColors(order.status)
  const unreachedBadgeClass = "bg-secondary text-secondary-foreground"

  return (
    <div className="flex flex-col gap-5">
      <ProgressHeader
        order={order}
        description={`Step ${currentIndex + 1} of ${workflowStatuses.length} · ${getLabel(order.status)}`}
        hideUpdatedOnMobile
      />
      {/* Mobile: vertical list, every label always visible, 44px touch targets. A
          horizontal track can only show 2-3 of up to 8 steps at once on a phone-width
          screen, and a sideways scroll gesture inside a small region isn't discoverable
          on touch — effectively hiding steps. Vertical reuses the page's existing
          vertical-scroll affordance instead. */}
      <div className="flex flex-col lg:hidden">
        {workflowStatuses.map((status, i) => {
          const isCurrent = i === currentIndex
          const isReached = i <= currentIndex
          const badgeColorClass = isReached ? currentColor.badge : unreachedBadgeClass
          const Icon = getIcon(status)
          const isLast = i === workflowStatuses.length - 1

          return (
            <div key={status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="relative inline-flex">
                  {isCurrent && (
                    <ArrivalPulse pulseKey={pulseKey} delayMs={arrivalDelay} colorClass={currentColor.solid} />
                  )}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          style={chipStyle(timing.chipDelay(i), isCurrent)}
                          className={cn(
                            badgeVariants({ variant: "plain" }),
                            badgeColorClass,
                            "border-transparent size-11 shrink-0 rounded-full p-0 cursor-default [&>svg]:size-5!",
                            CHIP_TRANSITION,
                            isCurrent && ENTRANCE_ANIMATION
                          )}
                        />
                      }
                    >
                      <Icon />
                      <span className="sr-only">{getLabel(status)}</span>
                    </TooltipTrigger>
                    <TooltipContent>{getLabel(status)}</TooltipContent>
                  </Tooltip>
                </span>
                {!isLast && (
                  <div className="relative my-1.5 min-h-6 w-0.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      style={{ transitionDelay: `${timing.connectorDelay(i)}ms` }}
                      className={cn(
                        "absolute inset-x-0 top-0",
                        currentColor.solid,
                        CONNECTOR_TRANSITION,
                        i < currentIndex ? "h-full" : "h-0"
                      )}
                    />
                  </div>
                )}
              </div>
              <div className="flex min-h-11 flex-col justify-center gap-0.5 self-start pb-3">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {stepLabel(status)}
                </span>
                {isCurrent && <UpdatedBy order={order} />}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: horizontal track. Connectors grow (flex-1) so the track always spans
          the full card width instead of clumping to the left on a wide page — only the
          chip columns stay fixed-size. overflow-x-auto is a defensive fallback only — at
          lg's 1024px minimum width, even an 8-step flow fits without scrolling. */}
      <div className="hidden items-center px-6 pb-10 lg:flex">
        {workflowStatuses.map((status, i) => {
          const isCurrent = i === currentIndex
          const isReached = i <= currentIndex
          const badgeColorClass = isReached ? currentColor.badge : unreachedBadgeClass
          const Icon = getIcon(status)
          const isLast = i === workflowStatuses.length - 1

          return (
            <div key={status} className={cn("flex items-center", isLast ? "shrink-0" : "flex-1")}>
              <div className="relative flex shrink-0 flex-col items-center">
                <span className="relative inline-flex">
                {isCurrent && (
                  <ArrivalPulse pulseKey={pulseKey} delayMs={arrivalDelay} colorClass={currentColor.solid} />
                )}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        style={chipStyle(timing.chipDelay(i), isCurrent)}
                        className={cn(
                          badgeVariants({ variant: "plain" }),
                          badgeColorClass,
                          "border-transparent size-9 shrink-0 rounded-full p-0 cursor-default [&>svg]:size-4!",
                          CHIP_TRANSITION,
                          isCurrent && ENTRANCE_ANIMATION
                        )}
                      />
                    }
                  >
                    <Icon />
                    <span className="sr-only">{getLabel(status)}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {getLabel(status)}
                    {isCurrent && order.statusUpdatedAt && (
                      <div className="text-background/70">
                        {formatDateTime(order.statusUpdatedAt)} ·{" "}
                        {actorLabel(order.statusUpdatedByName, order)}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
                </span>
                {/* Label + time, centered under the icon without widening its column. */}
                <div className="absolute top-full left-1/2 mt-2 flex -translate-x-1/2 flex-col items-center gap-1">
                <span
                  key={isCurrent ? `current-${pulseKey}` : status}
                  style={isCurrent ? { animationDelay: `${arrivalDelay}ms` } : undefined}
                  className={cn(
                    "text-xs leading-none font-medium whitespace-nowrap",
                    isCurrent
                      ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-300 [animation-fill-mode:both]"
                      : "invisible"
                  )}
                >
                  {stepLabel(status)}
                </span>
                {isCurrent && order.statusUpdatedAt && (
                  <span className="text-[0.7rem] leading-none whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatRelativeDate(order.statusUpdatedAt)}
                  </span>
                )}
                </div>
              </div>
              {!isLast && (
                <div className="relative mx-1.5 h-0.5 min-w-8 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    style={{ transitionDelay: `${timing.connectorDelay(i)}ms` }}
                    className={cn(
                      "absolute inset-y-0 left-0",
                      currentColor.solid,
                      CONNECTOR_TRANSITION,
                      i < currentIndex ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
