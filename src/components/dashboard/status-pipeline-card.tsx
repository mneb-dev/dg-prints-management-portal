import { useState } from "react"
import { PackageSearchIcon, TriangleAlertIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DASHBOARD_EXCLUDED_STATUSES, ORDER_TERMINAL_STATUSES } from "@/lib/order-status"
import { useActiveOrderStatuses, useOrderStatusLookup } from "@/lib/order-statuses"
import { useOrderActions, useOrderStats } from "@/lib/orders"
import { cn, formatDate } from "@/lib/utils"

// A non-zero stage never renders as an invisible sliver next to a much larger one.
const MIN_BAR_PERCENT = 2
// Matches the server's order_stats() buckets: an order waiting 3+ days (`over3d`) counts as
// delayed, and an oldest order past a week turns the stage's delay hint into a warning.
const STALE_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? null : Math.floor((now - time) / DAY_MS)
}

function plural(count: number, one: string, many: string) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`
}

// Orders that have left the pipeline: released (the finished outcome) first, then the terminal
// cancelled/refunded/returned statuses.
const CLOSED_STATUSES = [...DASHBOARD_EXCLUDED_STATUSES, ...ORDER_TERMINAL_STATUSES]

export function StatusPipelineCard() {
  const { stats, isLoading, isError } = useOrderStats()
  const { statuses } = useActiveOrderStatuses()
  const { getLabel, getColors } = useOrderStatusLookup()
  const { setOrdersFilter } = useOrderActions()
  const navigate = useNavigate()

  const pipelineStages = statuses.filter(
    (s) => !ORDER_TERMINAL_STATUSES.includes(s.name) && !DASHBOARD_EXCLUDED_STATUSES.includes(s.name)
  )

  // Absent on a server that predates aging support — every delay hint below is then skipped.
  const agingByStatus = stats?.agingByStatus
  const hasAging = agingByStatus !== undefined
  // Captured once per mount: ages are shown in whole days, so a fixed "now" is precise enough and
  // keeps render pure.
  const [now] = useState(() => Date.now())

  const rows = pipelineStages.map((item) => {
    const count = stats?.byStatus[item.name] ?? 0
    const aging = agingByStatus?.[item.name]
    const over3d = Math.min(count, aging?.over3d ?? 0)
    return {
      status: item.name,
      label: getLabel(item.name),
      count,
      colors: getColors(item.name),
      over3d,
      over7d: Math.min(over3d, aging?.over7d ?? 0),
      oldestAt: aging?.oldestAt ?? null,
      oldestDays: count > 0 ? daysSince(aging?.oldestAt, now) : null,
    }
  })
  const maxCount = Math.max(0, ...rows.map((row) => row.count))
  const activeTotal = rows.reduce((sum, row) => sum + row.count, 0)
  const delayedTotal = rows.reduce((sum, row) => sum + row.over3d, 0)

  // Same drill-down the dashboard's status tiles use.
  function goToOrders(status: string) {
    setOrdersFilter({ status, page: 1 })
    navigate("/orders")
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Order status pipeline</CardTitle>
        <CardDescription>
          {isLoading || !stats
            ? "Orders in each active stage"
            : `${plural(activeTotal, "active order", "active orders")}` +
              (delayedTotal > 0 ? ` · ${delayedTotal.toLocaleString()} delayed` : "")}
        </CardDescription>
        {hasAging && activeTotal > 0 ? (
          <CardAction className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-3 rounded-full bg-foreground/70" />
              <span className="leading-none">Waiting 3+ days</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-3 rounded-full bg-foreground/70 opacity-35" />
              <span className="leading-none">Under 3 days</span>
            </span>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3.5 py-1">
            {pipelineStages.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-1.5 flex-1 rounded-full" />
                <Skeleton className="h-3 w-5" />
              </div>
            ))}
            <div className="mt-1 flex gap-4 border-t pt-4">
              {CLOSED_STATUSES.map((status) => (
                <Skeleton key={status} className="h-3 w-20" />
              ))}
            </div>
          </div>
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load pipeline data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : !stats || stats.totalOrders === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <PackageSearchIcon />
            </EmptyMedia>
            <EmptyTitle>No orders yet</EmptyTitle>
            <EmptyDescription>New orders will appear here as they come in.</EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col">
            {/* One line per stage. Rows are subgrids of this grid, so every column lines up across
                stages. The name column is always the full longest name (never truncated — a
                `minmax(0, …)` track here gets starved by the 1fr bar column), and the bar takes
                whatever width is left, down to 3rem. */}
            <ul className="-mx-2 grid grid-cols-[max-content_minmax(3rem,1fr)_auto_minmax(1.5rem,auto)] gap-x-3 gap-y-0.5">
              {rows.map((row) => {
                const percent =
                  maxCount === 0 ? 0 : Math.max(MIN_BAR_PERCENT, Math.round((row.count / maxCount) * 100))
                // Share of this row's bar that's been waiting 3+ days (solid), the rest is newer (faded).
                const agedShare = row.count === 0 ? 0 : (row.over3d / row.count) * 100
                // Only a stage with delayed orders (3+ days) gets a hint — quiet stages stay quiet.
                const isDelayed = row.over3d > 0 && row.oldestDays !== null
                const isStale = isDelayed && row.oldestDays! >= STALE_DAYS
                const delayLines = isDelayed
                  ? [
                      `${row.over3d.toLocaleString()} of ${plural(row.count, "order", "orders")} waiting 3+ days`,
                      row.over7d > 0 ? `${row.over7d.toLocaleString()} waiting 7+ days` : null,
                      `Longest wait ${plural(row.oldestDays!, "day", "days")}` +
                        (row.oldestAt ? ` · since ${formatDate(row.oldestAt)}` : ""),
                    ].filter((line): line is string => line !== null)
                  : []
                return (
                  <li key={row.status} className="col-span-4 grid grid-cols-subgrid">
                    <button
                      type="button"
                      onClick={() => goToOrders(row.status)}
                      aria-label={
                        `${row.label}: ${plural(row.count, "order", "orders")}` +
                        (isDelayed ? `. Delayed: ${delayLines.join(", ")}` : "") +
                        " — view orders"
                      }
                      className="group/row col-span-4 grid cursor-pointer grid-cols-subgrid items-center rounded-md px-2 py-2 text-left text-sm transition-colors duration-200 ease-out outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={cn("size-2 shrink-0 translate-y-px rounded-full", row.colors.solid)}
                        />
                        <span className="leading-none whitespace-nowrap text-muted-foreground transition-colors group-hover/row:text-foreground">
                          {row.label}
                        </span>
                      </span>
                      <span aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <span
                          className="flex h-full overflow-hidden rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                          style={{ width: `${percent}%` }}
                        >
                          {hasAging ? (
                            <>
                              <span
                                className="h-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                                style={{ width: `${agedShare}%`, backgroundColor: row.colors.color }}
                              />
                              <span
                                className="h-full flex-1 opacity-35"
                                style={{ backgroundColor: row.colors.color }}
                              />
                            </>
                          ) : (
                            <span className="h-full flex-1" style={{ backgroundColor: row.colors.color }} />
                          )}
                        </span>
                      </span>
                      {/* Always rendered (even empty) so every row keeps the same 4 grid cells. */}
                      <span className="flex justify-end">
                        {isDelayed ? (
                          // A <span> trigger, not the default <button>, since the whole row is
                          // already a button; the row's aria-label carries the same detail.
                          <Tooltip>
                            <TooltipTrigger
                              render={<span />}
                              className={cn(
                                "flex items-center gap-1.5 text-xs leading-none whitespace-nowrap tabular-nums",
                                isStale ? "font-medium text-status-warning" : "text-muted-foreground"
                              )}
                            >
                              {isStale ? (
                                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-status-warning" />
                              ) : null}
                              {row.oldestDays}d
                            </TooltipTrigger>
                            <TooltipContent className="flex flex-col items-start gap-0.5">
                              <span className="font-medium">Delayed in {row.label}</span>
                              {delayLines.map((line) => (
                                <span key={line} className="opacity-80">
                                  {line}
                                </span>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "text-right leading-none font-semibold tabular-nums",
                          row.count === 0 && "text-muted-foreground"
                        )}
                      >
                        {row.count.toLocaleString()}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs">
              <span className="text-muted-foreground">Closed</span>
              {CLOSED_STATUSES.map((status) => {
                const count = stats.byStatus[status] ?? 0
                const label = getLabel(status)
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => goToOrders(status)}
                    aria-label={`${label}: ${plural(count, "order", "orders")} — view orders`}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-sm text-muted-foreground transition-[color,opacity] duration-200 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                      count === 0 && "opacity-60 hover:opacity-100"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("size-2 shrink-0 translate-y-px rounded-full", getColors(status).solid)}
                    />
                    <span className="leading-none">{label}</span>
                    <span className="leading-none font-medium text-foreground tabular-nums">
                      {count.toLocaleString()}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
