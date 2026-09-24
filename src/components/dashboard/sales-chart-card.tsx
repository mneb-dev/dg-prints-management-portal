import { useMemo, useState } from "react"
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getYear,
  isSunday,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import {
  ChevronDownIcon,
  LineChartIcon,
  MinusIcon,
  RotateCcwIcon,
  SparklesIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Money } from "@/components/money"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DateRangeFilter } from "@/components/date-range-filter"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import { ORDER_TERMINAL_STATUSES } from "@/lib/order-status"
import { PAYMENT_STATUSES, useSalesOrders } from "@/lib/orders"
import { MASKED_AMOUNT, useSalesVisibility } from "@/lib/sales-visibility"
import type { Order, PaymentStatus } from "@/lib/orders"
import { PAYMENT_STATUS_LABELS } from "@/components/orders/payment-status-badge"
import { useUserOptions } from "@/lib/users"
import type { UserOption } from "@/lib/users"
import { formatCurrency } from "@/lib/utils"

type PeriodPreset = "this_week" | "this_month" | "last_3_months" | "last_6_months" | "this_year" | "custom"
type BucketUnit = "day" | "week" | "month"
type SalesPoint = { label: string; [seriesKey: string]: number | string }
type Bucket = { label: string; start: Date; end: Date }
type PeriodRange = { currentStart: Date; currentEnd: Date; previousStart: Date }

const PRESET_LABELS: Record<PeriodPreset, string> = {
  this_week: "This week",
  this_month: "This month",
  last_3_months: "Last 3 months",
  last_6_months: "Last 6 months",
  this_year: "This year",
  custom: "Custom",
}

// Compact labels so all six admin presets fit in one segmented control; the full PRESET_LABELS
// text stays available as each button's aria-label/title.
const PRESET_SHORT_LABELS: Record<PeriodPreset, string> = {
  this_week: "Week",
  this_month: "Month",
  last_3_months: "3M",
  last_6_months: "6M",
  this_year: "Year",
  custom: "Custom",
}

type CompareBy = "total" | "creator" | "payment"

const COMPARE_LABELS: Record<CompareBy, string> = {
  total: "Total",
  creator: "Staff",
  payment: "Payment",
}

const COMPARE_ARIA_LABELS: Record<CompareBy, string> = {
  total: "Show a single total line",
  creator: "Compare by staff",
  payment: "Compare by payment status",
}

const COMPARE_OPTIONS: CompareBy[] = ["total", "creator", "payment"]

// Joined, pill-in-a-track segmented control built from ToggleGroup/Toggle — the active segment keeps
// Toggle's own primary-token pressed styles.
const SEGMENTED_GROUP_CLASS = "flex-nowrap gap-0.5 rounded-lg border border-input bg-muted/40 p-0.5"
const SEGMENTED_ITEM_CLASS = "h-7 rounded-md border-0 px-2.5 text-xs"

const PERIOD_DESCRIPTIONS: Record<PeriodPreset, string> = {
  this_week: "Total for this week",
  this_month: "Total for this month",
  last_3_months: "Total for the last 3 months",
  last_6_months: "Total for the last 6 months",
  this_year: "Total for this year",
  custom: "Total for the selected range",
}

// Admin/superadmin get every preset. Staff are restricted to short, coarse windows (this
// week/this month) — no custom range and no multi-month lookback — since those combined with
// unrestricted history would make it easier to infer overall business revenue even with amounts
// masked.
const ADMIN_PRESETS: PeriodPreset[] = [
  "this_week",
  "this_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "custom",
]
const STAFF_PRESETS: PeriodPreset[] = ["this_week", "this_month"]

function computePeriodRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
  now: Date
): PeriodRange | null {
  let currentStart: Date
  let currentEnd: Date
  let previousStart: Date

  switch (preset) {
    case "this_week":
      currentStart = startOfWeek(now, { weekStartsOn: 1 })
      currentEnd = endOfWeek(now, { weekStartsOn: 1 })
      previousStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      break
    case "this_month":
      currentStart = startOfMonth(now)
      currentEnd = endOfMonth(now)
      previousStart = startOfMonth(subMonths(now, 1))
      break
    case "last_3_months":
      currentStart = subMonths(now, 3)
      currentEnd = now
      previousStart = subMonths(now, 6)
      break
    case "last_6_months":
      currentStart = subMonths(now, 6)
      currentEnd = now
      previousStart = subMonths(now, 12)
      break
    case "this_year":
      currentStart = startOfYear(now)
      currentEnd = endOfYear(now)
      previousStart = startOfYear(subYears(now, 1))
      break
    case "custom": {
      if (!customFrom || !customTo || customFrom > customTo) return null
      currentStart = parseISO(customFrom)
      currentEnd = parseISO(customTo)
      const spanDays = differenceInCalendarDays(currentEnd, currentStart) + 1
      previousStart = subDays(currentStart, spanDays)
      break
    }
  }

  const today = endOfDay(now)
  const normalizedStart = startOfDay(currentStart)
  const normalizedEnd = endOfDay(currentEnd)
  // Never chart future dates — "This month"/"This year" etc. run through the calendar period's
  // end, but the visible range stops at today.
  const clampedEnd = normalizedEnd > today ? today : normalizedEnd

  if (clampedEnd < normalizedStart) return null

  return {
    currentStart: normalizedStart,
    currentEnd: clampedEnd,
    previousStart: startOfDay(previousStart),
  }
}

function pickBucketUnit(start: Date, end: Date): BucketUnit {
  const dayCount = differenceInCalendarDays(end, start) + 1
  if (dayCount <= 45) return "day"
  if (dayCount <= 200) return "week"
  return "month"
}

// Excludes cancelled/refunded/returned orders so a refund (or cancellation) immediately drops out
// of the sales total instead of continuing to count money that was never kept — same predicate
// Finance's finance_summary() uses for revenue.
function sumOrdersInRange(orders: Order[], start: Date, end: Date): number {
  return orders.reduce((sum, order) => {
    if (ORDER_TERMINAL_STATUSES.includes(order.status)) return sum
    const createdAt = new Date(order.createdAt)
    return isWithinInterval(createdAt, { start, end }) ? sum + order.total : sum
  }, 0)
}

function buildBuckets(range: PeriodRange, unit: BucketUnit, includeSunday: boolean): Bucket[] {
  const { currentStart, currentEnd } = range

  if (unit === "day") {
    return eachDayOfInterval({ start: currentStart, end: currentEnd })
      .filter((day) => includeSunday || !isSunday(day))
      .map((day) => ({ label: format(day, "MMM d"), start: startOfDay(day), end: endOfDay(day) }))
  }

  if (unit === "week") {
    return eachWeekOfInterval({ start: currentStart, end: currentEnd }, { weekStartsOn: 1 }).map((weekStart) => ({
      label: format(weekStart, "MMM d"),
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 }),
    }))
  }

  const spansMultipleYears = getYear(currentStart) !== getYear(currentEnd)
  return eachMonthOfInterval({ start: currentStart, end: currentEnd }).map((monthStart) => ({
    label: format(monthStart, spansMultipleYears ? "MMM yyyy" : "MMM"),
    start: monthStart,
    end: endOfMonth(monthStart),
  }))
}

function buildSeries(orders: Order[], buckets: Bucket[]): SalesPoint[] {
  return buckets.map((bucket) => ({
    label: bucket.label,
    total: sumOrdersInRange(orders, bucket.start, bucket.end),
  }))
}

function buildCreatorSeries(orders: Order[], buckets: Bucket[], creatorIds: string[]): SalesPoint[] {
  return buckets.map((bucket) => {
    const point: SalesPoint = { label: bucket.label }
    for (const id of creatorIds) {
      point[id] = sumOrdersInRange(
        orders.filter((order) => order.createdBy === id),
        bucket.start,
        bucket.end
      )
    }
    return point
  })
}

function buildPaymentStatusSeries(
  orders: Order[],
  buckets: Bucket[],
  statuses: PaymentStatus[]
): SalesPoint[] {
  return buckets.map((bucket) => {
    const point: SalesPoint = { label: bucket.label }
    for (const status of statuses) {
      point[status] = sumOrdersInRange(
        orders.filter((order) => order.payment.status === status),
        bucket.start,
        bucket.end
      )
    }
    return point
  })
}

type TrendKind = "up" | "down" | "flat" | "new" | "none"
type Trend = { kind: TrendKind; pct: number }

const PREVIOUS_PERIOD_LABELS: Record<PeriodPreset, string> = {
  this_week: "vs last week",
  this_month: "vs last month",
  last_3_months: "vs prior 3 months",
  last_6_months: "vs prior 6 months",
  this_year: "vs last year",
  custom: "vs prior period",
}

// Same tinted status-token variants the other Badges use — no bespoke colors.
const TREND_BADGE_VARIANTS = {
  up: "success",
  down: "destructive",
  flat: "secondary",
  new: "info",
} as const satisfies Record<Exclude<TrendKind, "none">, string>

// "new" = sales this period with nothing to compare against — shown as "New" rather than a
// made-up +100%. "none" = nothing on either side, so the badge is hidden entirely.
function computeTrend(current: number, previous: number): Trend {
  if (previous <= 0) return current > 0 ? { kind: "new", pct: 0 } : { kind: "none", pct: 0 }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { kind: "flat", pct }
  return { kind: pct > 0 ? "up" : "down", pct }
}

function formatTrendValue(trend: Trend): string {
  if (trend.kind === "new") return "New"
  if (trend.kind === "flat") return "0%"
  return `${trend.pct > 0 ? "+" : "−"}${Math.abs(trend.pct).toLocaleString()}%`
}

function TrendIcon({ kind }: { kind: TrendKind }) {
  if (kind === "up") return <TrendingUpIcon aria-hidden />
  if (kind === "down") return <TrendingDownIcon aria-hidden />
  if (kind === "new") return <SparklesIcon aria-hidden />
  return <MinusIcon aria-hidden />
}

// Default "Compare by staff" lines when no one is explicitly picked: the highest-grossing creators
// in the (already filtered) period, so the chart opens on the people who actually moved revenue.
function topCreatorIds(orders: Order[], limit: number): string[] {
  const totals = new Map<string, number>()
  for (const order of orders) {
    if (order.createdBy == null || ORDER_TERMINAL_STATUSES.includes(order.status)) continue
    totals.set(order.createdBy, (totals.get(order.createdBy) ?? 0) + order.total)
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}

const DEFAULT_CHART_CONFIG = {
  total: { label: "Sales", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const LINE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]
const MAX_SELECTED_CREATORS = LINE_COLORS.length

function creatorFullName(user: UserOption): string {
  return `${user.firstName} ${user.lastName}`
}

// Colors are assigned by each person's stable position in the full user list (not selection
// order), so a person's line color never shifts just because they were reselected in a different
// order.
function buildCreatorChartConfig(selectedIds: string[], userOptions: UserOption[]): ChartConfig {
  const indexById = new Map(userOptions.map((user, index) => [user.id, index]))
  const sortedIds = [...selectedIds].sort((a, b) => (indexById.get(a) ?? 0) - (indexById.get(b) ?? 0))
  const config: ChartConfig = {}
  sortedIds.forEach((id, colorIndex) => {
    const user = userOptions.find((candidate) => candidate.id === id)
    config[id] = {
      label: user ? creatorFullName(user) : "Unknown",
      color: LINE_COLORS[colorIndex % LINE_COLORS.length],
    }
  })
  return config
}

// Colors are assigned by each status's stable position in PAYMENT_STATUSES (not selection order),
// so a status's line color never shifts just because it was reselected in a different order.
function buildPaymentStatusChartConfig(selectedStatuses: PaymentStatus[]): ChartConfig {
  const sortedStatuses = [...selectedStatuses].sort(
    (a, b) => PAYMENT_STATUSES.indexOf(a) - PAYMENT_STATUSES.indexOf(b)
  )
  const config: ChartConfig = {}
  sortedStatuses.forEach((status, colorIndex) => {
    config[status] = {
      label: PAYMENT_STATUS_LABELS[status],
      color: LINE_COLORS[colorIndex % LINE_COLORS.length],
    }
  })
  return config
}

export function SalesChartCard() {
  const { role } = useAuth()
  const isStaffView = role === "staff"
  const presets = isStaffView ? STAFF_PRESETS : ADMIN_PRESETS

  const [preset, setPreset] = useState<PeriodPreset>("this_week")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [includeSunday, setIncludeSunday] = useState(true)
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([])
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<PaymentStatus[]>([])
  const [compareBy, setCompareBy] = useState<CompareBy>("total")

  const range = useMemo(
    () => computePeriodRange(preset, customFrom, customTo, new Date()),
    [preset, customFrom, customTo]
  )

  const dateFrom = range ? format(range.previousStart, "yyyy-MM-dd") : ""
  const dateTo = range ? format(range.currentEnd, "yyyy-MM-dd") : ""
  const { salesOrders, isLoading, isError, isPossiblyTruncated } = useSalesOrders(dateFrom, dateTo)
  const { isVisible } = useSalesVisibility()
  const showAmounts = !isStaffView && isVisible
  const { users: userOptions, isLoading: isLoadingUsers } = useUserOptions(
    true,
    true,
    isStaffView ? "staff" : undefined
  )
  // Fetch includes inactive users so past orders from a former staff member can still be
  // isolated/rolled up, but inactive accounts shouldn't be offered as pickable filter options.
  const activeUserOptions = userOptions.filter((user) => user.status === "active")

  const { currentOrders, previousOrders } = useMemo(() => {
    if (!range) return { currentOrders: [] as Order[], previousOrders: [] as Order[] }
    const current: Order[] = []
    const previous: Order[] = []
    for (const order of salesOrders) {
      const createdAt = new Date(order.createdAt)
      if (!includeSunday && isSunday(createdAt)) continue
      ;(createdAt >= range.currentStart ? current : previous).push(order)
    }
    return { currentOrders: current, previousOrders: previous }
  }, [salesOrders, range, includeSunday])

  const allStaffIds = useMemo(() => new Set(userOptions.map((user) => user.id)), [userOptions])
  const creatorIdSet = useMemo(() => {
    if (selectedCreatorIds.length > 0) return new Set(selectedCreatorIds)
    return isStaffView && !isLoadingUsers ? allStaffIds : new Set<string>()
  }, [selectedCreatorIds, isStaffView, isLoadingUsers, allStaffIds])
  const paymentStatusSet = useMemo(() => new Set(selectedPaymentStatuses), [selectedPaymentStatuses])
  const filteredCurrentOrders = useMemo(
    () =>
      currentOrders.filter(
        (order) =>
          (creatorIdSet.size === 0 || (order.createdBy != null && creatorIdSet.has(order.createdBy))) &&
          (paymentStatusSet.size === 0 || paymentStatusSet.has(order.payment.status))
      ),
    [currentOrders, creatorIdSet, paymentStatusSet]
  )
  const filteredPreviousOrders = useMemo(
    () =>
      previousOrders.filter(
        (order) =>
          (creatorIdSet.size === 0 || (order.createdBy != null && creatorIdSet.has(order.createdBy))) &&
          (paymentStatusSet.size === 0 || paymentStatusSet.has(order.payment.status))
      ),
    [previousOrders, creatorIdSet, paymentStatusSet]
  )

  const bucketUnit = range ? pickBucketUnit(range.currentStart, range.currentEnd) : "day"
  // "Compare by" alone decides which lines the chart draws; the creator/payment filters only narrow
  // which orders are included. Staff always see the single total line.
  const effectiveCompareBy: CompareBy = isStaffView ? "total" : compareBy
  const creatorLineIds = useMemo(
    () =>
      effectiveCompareBy !== "creator"
        ? []
        : selectedCreatorIds.length > 0
          ? selectedCreatorIds
          : topCreatorIds(filteredCurrentOrders, MAX_SELECTED_CREATORS),
    [effectiveCompareBy, selectedCreatorIds, filteredCurrentOrders]
  )
  const paymentLineStatuses = useMemo<PaymentStatus[]>(
    () =>
      effectiveCompareBy !== "payment"
        ? []
        : selectedPaymentStatuses.length > 0
          ? selectedPaymentStatuses
          : [...PAYMENT_STATUSES],
    [effectiveCompareBy, selectedPaymentStatuses]
  )
  const chartConfig = useMemo<ChartConfig>(() => {
    if (effectiveCompareBy === "creator") return buildCreatorChartConfig(creatorLineIds, userOptions)
    if (effectiveCompareBy === "payment") return buildPaymentStatusChartConfig(paymentLineStatuses)
    return DEFAULT_CHART_CONFIG
  }, [effectiveCompareBy, creatorLineIds, paymentLineStatuses, userOptions])
  const multiLineKeys: string[] | null =
    effectiveCompareBy === "creator"
      ? creatorLineIds
      : effectiveCompareBy === "payment"
        ? paymentLineStatuses
        : null
  const series = useMemo(() => {
    if (!range) return []
    const buckets = buildBuckets(range, bucketUnit, includeSunday)
    if (effectiveCompareBy === "creator") return buildCreatorSeries(filteredCurrentOrders, buckets, creatorLineIds)
    if (effectiveCompareBy === "payment")
      return buildPaymentStatusSeries(filteredCurrentOrders, buckets, paymentLineStatuses)
    return buildSeries(filteredCurrentOrders, buckets)
  }, [
    filteredCurrentOrders,
    range,
    bucketUnit,
    includeSunday,
    effectiveCompareBy,
    creatorLineIds,
    paymentLineStatuses,
  ])

  const hasActiveFilters =
    selectedPaymentStatuses.length > 0 || selectedCreatorIds.length > 0 || !includeSunday || compareBy !== "total"

  function resetFilters() {
    setSelectedPaymentStatuses([])
    setSelectedCreatorIds([])
    setIncludeSunday(true)
    setCompareBy("total")
  }

  // Chip dots reuse the line color when that dimension is driving the chart, otherwise the single
  // series color.
  function chipDotColor(key: string, isCompareDimension: boolean): string {
    return isCompareDimension ? ((chartConfig[key]?.color as string) ?? "var(--color-chart-1)") : "var(--color-chart-1)"
  }

  const periodTotal = filteredCurrentOrders.reduce(
    (sum, order) => (ORDER_TERMINAL_STATUSES.includes(order.status) ? sum : sum + order.total),
    0
  )
  const previousTotal = filteredPreviousOrders.reduce(
    (sum, order) => (ORDER_TERMINAL_STATUSES.includes(order.status) ? sum : sum + order.total),
    0
  )
  const trend = computeTrend(periodTotal, previousTotal)

  function toggleCreator(id: string, checked: boolean) {
    setSelectedCreatorIds((prev) => (checked ? [...prev, id] : prev.filter((existing) => existing !== id)))
  }

  function removeCreator(id: string) {
    setSelectedCreatorIds((prev) => prev.filter((existing) => existing !== id))
  }

  function togglePaymentStatus(status: PaymentStatus, checked: boolean) {
    setSelectedPaymentStatuses((prev) =>
      checked ? [...prev, status] : prev.filter((existing) => existing !== status)
    )
  }

  function removePaymentStatus(status: PaymentStatus) {
    setSelectedPaymentStatuses((prev) => prev.filter((existing) => existing !== status))
  }

  const creatorTriggerLabel =
    selectedCreatorIds.length === 0
      ? "All"
      : selectedCreatorIds.length === 1
        ? (() => {
            const user = userOptions.find((candidate) => candidate.id === selectedCreatorIds[0])
            return user ? creatorFullName(user) : "1 selected"
          })()
        : `${selectedCreatorIds.length} selected`
  const paymentTriggerLabel =
    selectedPaymentStatuses.length === 0
      ? "All"
      : selectedPaymentStatuses.length === 1
        ? PAYMENT_STATUS_LABELS[selectedPaymentStatuses[0]]
        : `${selectedPaymentStatuses.length} selected`

  return (
    <Card className="xl:col-span-3">
      <CardHeader>
        <CardTitle>Sales overview</CardTitle>
        <CardDescription>
          {effectiveCompareBy === "creator"
            ? "Revenue trend · compared by staff"
            : effectiveCompareBy === "payment"
              ? "Revenue trend · compared by payment status"
              : "Revenue trend for the selected period"}
        </CardDescription>
        <CardAction className="max-w-full overflow-x-auto">
          <ToggleGroup
            aria-label="Sales period"
            value={[preset]}
            onValueChange={(next) => {
              const value = next[0] as PeriodPreset | undefined
              if (value) setPreset(value)
            }}
            className={SEGMENTED_GROUP_CLASS}
          >
            {presets.map((value) => (
              <Toggle
                key={value}
                value={value}
                aria-label={PRESET_LABELS[value]}
                title={PRESET_LABELS[value]}
                className={SEGMENTED_ITEM_CLASS}
              >
                {isStaffView ? PRESET_LABELS[value] : PRESET_SHORT_LABELS[value]}
              </Toggle>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!isStaffView ? (
          <div className="mb-4 flex flex-col gap-3 border-b pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {preset === "custom" ? (
                <DateRangeFilter
                  id="sales-date-range"
                  from={customFrom}
                  to={customTo}
                  onChange={(from, to) => {
                    setCustomFrom(from)
                    setCustomTo(to)
                  }}
                />
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="max-w-52 justify-between gap-1.5 text-xs"
                    />
                  }
                >
                  <span className="truncate">
                    <span className="text-muted-foreground">Payment:</span> {paymentTriggerLabel}
                  </span>
                  <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Filter by payment status</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={selectedPaymentStatuses.length === 0}
                    onCheckedChange={() => setSelectedPaymentStatuses([])}
                  >
                    All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {PAYMENT_STATUSES.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={selectedPaymentStatuses.includes(status)}
                      onCheckedChange={(checked) => togglePaymentStatus(status, !!checked)}
                    >
                      {PAYMENT_STATUS_LABELS[status]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLoadingUsers}
                      className="max-w-56 justify-between gap-1.5 text-xs"
                    />
                  }
                >
                  <span className="truncate">
                    <span className="text-muted-foreground">Created by:</span> {creatorTriggerLabel}
                  </span>
                  <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Filter by creator</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={selectedCreatorIds.length === 0}
                    onCheckedChange={() => setSelectedCreatorIds([])}
                  >
                    All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {activeUserOptions.map((user) => {
                    const isChecked = selectedCreatorIds.includes(user.id)
                    const atCap = !isChecked && selectedCreatorIds.length >= MAX_SELECTED_CREATORS
                    return (
                      <DropdownMenuCheckboxItem
                        key={user.id}
                        checked={isChecked}
                        disabled={atCap}
                        title={atCap ? `Up to ${MAX_SELECTED_CREATORS} people can be compared at once` : undefined}
                        onCheckedChange={(checked) => toggleCreator(user.id, !!checked)}
                      >
                        {creatorFullName(user)}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Toggle
                pressed={includeSunday}
                onPressedChange={setIncludeSunday}
                title={includeSunday ? "Sundays are included" : "Sundays are excluded"}
                className="h-7 px-2.5 text-xs"
              >
                Sundays
              </Toggle>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Compare by</span>
                <ToggleGroup
                  aria-label="Compare by"
                  value={[compareBy]}
                  onValueChange={(next) => {
                    const value = next[0] as CompareBy | undefined
                    if (value) setCompareBy(value)
                  }}
                  className={SEGMENTED_GROUP_CLASS}
                >
                  {COMPARE_OPTIONS.map((value) => (
                    <Toggle
                      key={value}
                      value={value}
                      aria-label={COMPARE_ARIA_LABELS[value]}
                      className={SEGMENTED_ITEM_CLASS}
                    >
                      {COMPARE_LABELS[value]}
                    </Toggle>
                  ))}
                </ToggleGroup>
                {hasActiveFilters ? (
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={resetFilters}>
                    <RotateCcwIcon className="size-3.5" />
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>

            {selectedPaymentStatuses.length > 0 || selectedCreatorIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedPaymentStatuses.map((status) => {
                  const name = PAYMENT_STATUS_LABELS[status]
                  return (
                    <Badge key={status} variant="secondary" className="gap-1.5 pr-1">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 translate-y-px rounded-full"
                        style={{ backgroundColor: chipDotColor(status, effectiveCompareBy === "payment") }}
                      />
                      <span className="leading-none">{name}</span>
                      <button
                        type="button"
                        onClick={() => removePaymentStatus(status)}
                        className="rounded-full p-0.5 hover:bg-foreground/10"
                      >
                        <XIcon className="size-3" />
                        <span className="sr-only">Remove filter: {name}</span>
                      </button>
                    </Badge>
                  )
                })}
                {selectedCreatorIds.map((id) => {
                  const user = userOptions.find((candidate) => candidate.id === id)
                  const name = user ? creatorFullName(user) : "Unknown"
                  return (
                    <Badge key={id} variant="secondary" className="gap-1.5 pr-1">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 translate-y-px rounded-full"
                        style={{ backgroundColor: chipDotColor(id, effectiveCompareBy === "creator") }}
                      />
                      <span className="leading-none">{name}</span>
                      <button
                        type="button"
                        onClick={() => removeCreator(id)}
                        className="rounded-full p-0.5 hover:bg-foreground/10"
                      >
                        <XIcon className="size-3" />
                        <span className="sr-only">Remove filter: {name}</span>
                      </button>
                    </Badge>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {!range ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <LineChartIcon />
            </EmptyMedia>
            <EmptyTitle>Pick a date range</EmptyTitle>
            <EmptyDescription>Select both a start and end date to see sales for that period.</EmptyDescription>
          </Empty>
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load sales data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : filteredCurrentOrders.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <LineChartIcon />
            </EmptyMedia>
            <EmptyTitle>No sales yet</EmptyTitle>
            <EmptyDescription>Your revenue trend will appear here once orders come in.</EmptyDescription>
          </Empty>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                {!isStaffView ? (
                  <span className="text-3xl font-semibold tabular-nums">
                    <Money amount={periodTotal} hidden={!isVisible} />
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {preset === "custom"
                    ? `Total for ${format(range.currentStart, "MMM d, yyyy")} – ${format(range.currentEnd, "MMM d, yyyy")}`
                    : PERIOD_DESCRIPTIONS[preset]}
                </span>
                {isPossiblyTruncated ? (
                  <span className="text-xs text-status-warning">
                    Showing up to 200 most recent orders in range.
                  </span>
                ) : null}
              </div>
              {trend.kind !== "none" ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant={TREND_BADGE_VARIANTS[trend.kind]}
                        className="h-6 cursor-default gap-1.5 px-2.5 [&>svg]:size-3.5!"
                      />
                    }
                  >
                    <TrendIcon kind={trend.kind} />
                    <span className="font-semibold tabular-nums">{formatTrendValue(trend)}</span>
                    <span className="font-normal opacity-80">{PREVIOUS_PERIOD_LABELS[preset]}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col gap-0.5">
                      <span>
                        Previous period: {format(range.previousStart, "MMM d, yyyy")} –{" "}
                        {format(subDays(range.currentStart, 1), "MMM d, yyyy")}
                      </span>
                      {showAmounts ? (
                        <span className="tabular-nums">
                          {formatCurrency(previousTotal)} → {formatCurrency(periodTotal)}
                        </span>
                      ) : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <AreaChart data={series} margin={{ left: 4, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(value: number) => (showAmounts ? formatCurrency(value) : MASKED_AMOUNT)}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--color-border)" }}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const isMulti = multiLineKeys !== null
                        const key = String(name)
                        const displayName = isMulti ? (chartConfig[key]?.label ?? key) : "Sales"
                        const swatch = isMulti ? (chartConfig[key]?.color as string) : "var(--color-chart-1)"
                        return (
                          <div className="flex w-full items-center gap-2">
                            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: swatch }} />
                            <span className="flex-1 text-muted-foreground">{displayName}</span>
                            <span className="font-mono font-medium text-foreground tabular-nums">
                              {showAmounts ? formatCurrency(Number(value)) : MASKED_AMOUNT}
                            </span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                {multiLineKeys ? (
                  multiLineKeys.map((key) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={`var(--color-${key})`}
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  ))
                ) : (
                  <Area type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} fill="url(#salesFill)" />
                )}
                {multiLineKeys ? <ChartLegend content={<ChartLegendContent />} /> : null}
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
