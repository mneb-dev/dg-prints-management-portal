import { Fragment, useMemo, useState } from "react"
import { endOfMonth, format, parseISO } from "date-fns"
import { ChevronDownIcon, HandCoinsIcon, HistoryIcon, MoreHorizontalIcon, PieChartIcon, Undo2Icon } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"
import { toast } from "sonner"

import { Money } from "@/components/money"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DotBadge } from "@/components/dot-badge"
import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { TABLE_HEAD_CLASS, TABLE_HEADER_CLASS } from "@/components/table-surface"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  useIncentiveMonthSplit,
  useMonthlyIncentiveHistory,
  useMonthlyIncentiveReleaseActions,
  type MonthlyIncentiveStaffShare,
} from "@/lib/commission"
import { useSalesVisibility } from "@/lib/sales-visibility"
import { cn, formatCurrency } from "@/lib/utils"

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMMM"))
const MONTH_FILTER_OPTIONS = [{ value: "all", label: "All months" }, ...MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }))]
const YEAR_LOOKBACK = 4

type ConfirmTarget = { periodMonth: string; action: "release" | "unrelease" }

export function IncentiveHistoryTable() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [monthFilter, setMonthFilter] = useState("all")
  const [isMutating, setIsMutating] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())

  const { rows, isLoading, isError, refetch } = useMonthlyIncentiveHistory(year)

  function toggleExpanded(periodMonth: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(periodMonth)) next.delete(periodMonth)
      else next.add(periodMonth)
      return next
    })
  }
  const { isVisible } = useSalesVisibility()
  const { release, unrelease } = useMonthlyIncentiveReleaseActions()

  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_LOOKBACK + 1 }, (_, i) => currentYear - i),
    [currentYear]
  )

  const filteredRows = useMemo(() => {
    if (monthFilter === "all") return rows
    return rows.filter((row) => String(parseISO(row.periodMonth).getMonth() + 1) === monthFilter)
  }, [rows, monthFilter])

  // Newest month first -- the history RPC returns Jan-first, which reads backwards for "what do I
  // need to release" (the most recently completed month is usually what an admin is here to act on).
  const sortedRows = useMemo(() => [...filteredRows].reverse(), [filteredRows])

  async function handleConfirm() {
    if (!confirmTarget) return
    setIsMutating(true)
    try {
      const monthStart = parseISO(confirmTarget.periodMonth)
      const dateFrom = format(monthStart, "yyyy-MM-dd")
      const dateTo = format(endOfMonth(monthStart), "yyyy-MM-dd")
      if (confirmTarget.action === "release") {
        await release(dateFrom, dateTo)
        toast.success("Monthly incentive released.")
      } else {
        await unrelease(dateFrom, dateTo)
        toast.success("Monthly incentive release undone.")
      }
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update the release.")
    } finally {
      setIsMutating(false)
      setConfirmTarget(null)
    }
  }

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <OrderFormSectionHeader
          icon={HistoryIcon}
          title="Incentive releases"
          description="Release each past month's pool to staff"
        />
        <CardAction className="flex items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={(value) => {
              if (!value) return
              setYear(Number(value))
              setExpanded(new Set())
            }}
          >
            <SelectTrigger size="sm" aria-label="Year" className="w-24 text-xs">
              <SelectValue>{(value: string | null) => value ?? String(year)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={(value) => value && setMonthFilter(value)}>
            <SelectTrigger size="sm" aria-label="Month" className="w-32 text-xs">
              <SelectValue>
                {(value: string | null) =>
                  MONTH_FILTER_OPTIONS.find((option) => option.value === (value ?? monthFilter))?.label ??
                  "All months"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONTH_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="px-4 pb-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <div className="px-4 pb-4">
            <Empty className="border">
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>Couldn't load the release history</EmptyTitle>
              <EmptyDescription>Try refreshing the page.</EmptyDescription>
            </Empty>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="px-4 pb-4">
            <Empty className="border">
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>No months to show</EmptyTitle>
              <EmptyDescription>Try a different year or month filter.</EmptyDescription>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableHeader className={TABLE_HEADER_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TABLE_HEAD_CLASS}>Month</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Staff sales</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Pool</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "w-0 text-right")}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => {
                const monthLabel = format(parseISO(row.periodMonth), "MMMM yyyy")
                const isExpanded = expanded.has(row.periodMonth)
                return (
                  <Fragment key={row.periodMonth}>
                    <TableRow className={cn("hover:bg-transparent", isExpanded && "border-b-0")}>
                      <TableCell className="py-1.5 pr-4 pl-2 font-medium">
                        {/* Same toggle + chevron chip as the order item summary's collapsibles. */}
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Hide" : "Show"} split for ${monthLabel}`}
                          onClick={() => toggleExpanded(row.periodMonth)}
                          className="group/toggle flex min-h-10 items-center gap-2.5 rounded-lg pr-3 pl-1.5 text-left outline-none transition-colors duration-200 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-[background-color,color,rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/toggle:bg-accent group-hover/toggle:text-accent-foreground motion-reduce:transition-colors",
                              isExpanded ? "rotate-180" : ""
                            )}
                          >
                            <ChevronDownIcon className="size-4" />
                          </span>
                          {monthLabel}
                        </button>
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums">
                        <Money amount={row.totalStaffSales} hidden={!isVisible} />
                      </TableCell>
                      <TableCell className="px-4 text-right font-semibold tabular-nums">
                        {formatCurrency(row.pool)}
                      </TableCell>
                      <TableCell className="px-4">
                        {row.isCurrentMonth ? (
                          <DotBadge dotClassName="bg-order-status-violet">In progress</DotBadge>
                        ) : row.releasedAt ? (
                          <DotBadge dotClassName="bg-order-status-teal">Released</DotBadge>
                        ) : (
                          <DotBadge dotClassName="bg-order-status-gold">Not released</DotBadge>
                        )}
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex justify-end">
                          {row.isCurrentMonth ? (
                            <span className="text-xs whitespace-nowrap text-muted-foreground">After month ends</span>
                          ) : row.releasedAt ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`More actions for ${monthLabel}`}
                                    disabled={isMutating}
                                    className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                                  />
                                }
                              >
                                <MoreHorizontalIcon />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-44">
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setConfirmTarget({ periodMonth: row.periodMonth, action: "unrelease" })}
                                >
                                  <Undo2Icon />
                                  <span className="leading-none">Undo release</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : row.pool <= 0 ? (
                            <Tooltip>
                              <TooltipTrigger render={<span tabIndex={0} />}>
                                <Button type="button" variant="outline" size="sm" disabled>
                                  Release
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>No incentive to release — no tier was reached.</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isMutating}
                              onClick={() => setConfirmTarget({ periodMonth: row.periodMonth, action: "release" })}
                            >
                              <HandCoinsIcon data-icon="inline-start" />
                              Release
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="px-4 pt-0 pb-3 whitespace-normal">
                          <MonthSplitDonut periodMonth={row.periodMonth} className="ml-9 max-w-md" />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        tone={confirmTarget?.action === "release" ? "primary" : "danger"}
        icon={HandCoinsIcon}
        title={
          confirmTarget?.action === "release"
            ? `Release ${confirmTarget ? format(parseISO(confirmTarget.periodMonth), "MMMM yyyy") : ""}'s incentive?`
            : "Undo this release?"
        }
        description={
          confirmTarget?.action === "release"
            ? "Creates one payroll expense per staff member."
            : "Deletes the payroll expenses this release created, so the incentive is computed live again."
        }
        confirmLabel={confirmTarget?.action === "release" ? "Release" : "Undo"}
        pendingLabel={confirmTarget?.action === "release" ? "Releasing…" : "Undoing…"}
        cancelLabel={confirmTarget?.action === "release" ? "Later" : "Keep"}
        isPending={isMutating}
        onConfirm={handleConfirm}
      >
        {confirmTarget?.action === "release" ? <MonthSplitDonut periodMonth={confirmTarget.periodMonth} /> : null}
      </ConfirmDialog>
    </Card>
  )
}

// Validated (dataviz validate_palette.js, light + dark, incl. the ring's last→first wrap): chart-2
// is dropped because it's indistinguishable from chart-1. A 5th+ person folds into a gray "Others".
const SLICE_COLORS = ["var(--color-chart-1)", "var(--color-chart-4)", "var(--color-chart-3)", "var(--color-chart-5)"]
const OTHERS_COLOR = "var(--color-muted-foreground)"

type Slice = { key: string; name: string; value: number; percent: number; fill: string }

/** Biggest shares get their own slice, the rest fold into "Others". Colors follow the person
 * (alphabetical among the named slices), not their rank. */
function toSlices(rows: MonthlyIncentiveStaffShare[]): Slice[] {
  const sorted = [...rows].sort((a, b) => b.commissionShare - a.commissionShare)
  const named = sorted.length > SLICE_COLORS.length ? sorted.slice(0, SLICE_COLORS.length - 1) : sorted
  const rest = sorted.slice(named.length)
  const colorOrder = [...named].sort((a, b) => a.name.localeCompare(b.name)).map((row) => row.userId)
  const slices: Slice[] = named.map((row) => ({
    key: row.userId,
    name: row.name,
    value: row.commissionShare,
    percent: row.percentageShare,
    fill: SLICE_COLORS[colorOrder.indexOf(row.userId)],
  }))
  if (rest.length > 0) {
    slices.push({
      key: "others",
      name: `${rest.length} others`,
      value: rest.reduce((sum, row) => sum + row.commissionShare, 0),
      percent: rest.reduce((sum, row) => sum + row.percentageShare, 0),
      fill: OTHERS_COLOR,
    })
  }
  return slices
}

/** One month's per-staff split as a small donut + legend, fetched on demand. */
function MonthSplitDonut({ periodMonth, className }: { periodMonth: string; className?: string }) {
  const { rows, isLoading, isError, refetch } = useIncentiveMonthSplit(periodMonth)
  const slices = useMemo(() => toSlices(rows), [rows])
  const chartConfig = useMemo(
    () => Object.fromEntries(slices.map((slice) => [slice.key, { label: slice.name, color: slice.fill }])) satisfies ChartConfig,
    [slices]
  )
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  if (isLoading && rows.length === 0) {
    return (
      <div className={cn("flex items-center gap-6", className)}>
        <Skeleton className="size-28 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    )
  }

  if (isError || rows.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 py-1 text-sm text-muted-foreground", className)}>
        <PieChartIcon aria-hidden className="size-4" />
        {isError ? "Couldn't load" : "No staff sales"}
        {isError ? (
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={refetch}>
            Retry
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex animate-in flex-col items-center gap-4 duration-200 fade-in-0 slide-in-from-top-1 sm:flex-row sm:gap-6 motion-reduce:animate-none",
        className
      )}
    >
      <div className="relative size-28 shrink-0">
        <ChartContainer config={chartConfig} className="aspect-square size-full">
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel nameKey="key" formatter={(value) => formatCurrency(Number(value))} />}
            />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="key"
              innerRadius={38}
              outerRadius={54}
              stroke="var(--color-card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>

      {/* The legend doubles as the table view: every slice's name, share and amount. */}
      <ul className="flex w-full min-w-0 flex-1 flex-col gap-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: slice.fill }} />
            <span title={slice.name} className="min-w-0 flex-1 truncate">
              {slice.name}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{Math.round(slice.percent)}%</span>
            <span className="w-24 text-right font-medium tabular-nums">{formatCurrency(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
