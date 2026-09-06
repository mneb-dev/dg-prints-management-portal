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
  EyeIcon,
  EyeOffIcon,
  LineChartIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
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
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth"
import { useSalesOrders } from "@/lib/orders"
import { useSalesVisibility } from "@/lib/sales-visibility"
import type { Order } from "@/lib/orders"
import { useUserOptions } from "@/lib/users"
import type { UserOption } from "@/lib/users"
import { cn, formatCurrency } from "@/lib/utils"

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

function sumOrdersInRange(orders: Order[], start: Date, end: Date): number {
  return orders.reduce((sum, order) => {
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

const DEFAULT_CHART_CONFIG = {
  total: { label: "Sales", color: "var(--color-chart-1)" },
} satisfies ChartConfig

const CREATOR_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]
const MAX_SELECTED_CREATORS = CREATOR_COLORS.length

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
      color: CREATOR_COLORS[colorIndex % CREATOR_COLORS.length],
    }
  })
  return config
}

const MASKED_AMOUNT = "₱****"

export function SalesChartCard() {
  const { role } = useAuth()
  const isStaffView = role === "staff"
  const presets = isStaffView ? STAFF_PRESETS : ADMIN_PRESETS

  const [preset, setPreset] = useState<PeriodPreset>("this_week")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [includeSunday, setIncludeSunday] = useState(true)
  const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([])

  const range = useMemo(
    () => computePeriodRange(preset, customFrom, customTo, new Date()),
    [preset, customFrom, customTo]
  )

  const dateFrom = range ? format(range.previousStart, "yyyy-MM-dd") : ""
  const dateTo = range ? format(range.currentEnd, "yyyy-MM-dd") : ""
  const { salesOrders, isLoading, isError, isPossiblyTruncated } = useSalesOrders(dateFrom, dateTo)
  const { isVisible, toggleVisibility } = useSalesVisibility()
  const showAmounts = !isStaffView && isVisible
  const { users: userOptions, isLoading: isLoadingUsers } = useUserOptions(
    true,
    true,
    isStaffView ? "staff" : undefined
  )

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
  const filteredCurrentOrders = useMemo(
    () =>
      creatorIdSet.size === 0
        ? currentOrders
        : currentOrders.filter((order) => order.createdBy != null && creatorIdSet.has(order.createdBy)),
    [currentOrders, creatorIdSet]
  )
  const filteredPreviousOrders = useMemo(
    () =>
      creatorIdSet.size === 0
        ? previousOrders
        : previousOrders.filter((order) => order.createdBy != null && creatorIdSet.has(order.createdBy)),
    [previousOrders, creatorIdSet]
  )

  const bucketUnit = range ? pickBucketUnit(range.currentStart, range.currentEnd) : "day"
  const chartConfig = useMemo<ChartConfig>(
    () =>
      selectedCreatorIds.length > 1
        ? buildCreatorChartConfig(selectedCreatorIds, userOptions)
        : DEFAULT_CHART_CONFIG,
    [selectedCreatorIds, userOptions]
  )
  const series = useMemo(() => {
    if (!range) return []
    const buckets = buildBuckets(range, bucketUnit, includeSunday)
    return selectedCreatorIds.length > 1
      ? buildCreatorSeries(filteredCurrentOrders, buckets, selectedCreatorIds)
      : buildSeries(filteredCurrentOrders, buckets)
  }, [filteredCurrentOrders, range, bucketUnit, includeSunday, selectedCreatorIds])

  const periodTotal = filteredCurrentOrders.reduce((sum, order) => sum + order.total, 0)
  const previousTotal = filteredPreviousOrders.reduce((sum, order) => sum + order.total, 0)
  const changePct =
    previousTotal > 0
      ? Math.round(((periodTotal - previousTotal) / previousTotal) * 100)
      : periodTotal > 0
        ? 100
        : 0
  const isUp = changePct >= 0

  function toggleCreator(id: string, checked: boolean) {
    setSelectedCreatorIds((prev) => (checked ? [...prev, id] : prev.filter((existing) => existing !== id)))
  }

  function removeCreator(id: string) {
    setSelectedCreatorIds((prev) => prev.filter((existing) => existing !== id))
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Sales overview</CardTitle>
        <CardDescription>Revenue trend for the selected period</CardDescription>
        <CardAction className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch size="sm" checked={includeSunday} onCheckedChange={(checked) => setIncludeSunday(!!checked)} />
            Include Sunday
          </label>
          <Select value={preset} onValueChange={(value) => value && setPreset(value as PeriodPreset)}>
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue>
                {(value: string | null) => PRESET_LABELS[(value as PeriodPreset) ?? "this_week"]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {presets.map((value) => (
                <SelectItem key={value} value={value}>
                  {PRESET_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoadingUsers}
                  className="max-w-40 justify-between gap-1.5 text-xs"
                />
              }
            >
              <span className="truncate">
                {selectedCreatorIds.length === 0
                  ? "All"
                  : selectedCreatorIds.length === 1
                    ? (() => {
                        const user = userOptions.find((candidate) => candidate.id === selectedCreatorIds[0])
                        return user ? creatorFullName(user) : "1 selected"
                      })()
                    : `${selectedCreatorIds.length} selected`}
              </span>
              <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
              {userOptions.map((user) => {
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
        </CardAction>
      </CardHeader>
      <CardContent>
        {preset === "custom" ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-input px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="sales-date-from" className="text-sm text-muted-foreground">
                From
              </Label>
              <Popover>
                <PopoverTrigger
                  id="sales-date-from"
                  render={<Button variant="ghost" size="sm" className="h-8 px-1.5 font-normal" />}
                >
                  <span className={customFrom ? undefined : "text-muted-foreground"}>
                    {customFrom ? format(parseISO(customFrom), "MMM d, yyyy") : "Select date"}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customFrom ? parseISO(customFrom) : undefined}
                    onSelect={(date) => setCustomFrom(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={[{ after: new Date() }, ...(customTo ? [{ after: parseISO(customTo) }] : [])]}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Label htmlFor="sales-date-to" className="text-sm text-muted-foreground">
                To
              </Label>
              <Popover>
                <PopoverTrigger
                  id="sales-date-to"
                  render={<Button variant="ghost" size="sm" className="h-8 px-1.5 font-normal" />}
                >
                  <span className={customTo ? undefined : "text-muted-foreground"}>
                    {customTo ? format(parseISO(customTo), "MMM d, yyyy") : "Select date"}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customTo ? parseISO(customTo) : undefined}
                    onSelect={(date) => setCustomTo(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={[{ after: new Date() }, ...(customFrom ? [{ before: parseISO(customFrom) }] : [])]}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : null}

        {selectedCreatorIds.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {selectedCreatorIds.map((id) => {
              const user = userOptions.find((candidate) => candidate.id === id)
              const name = user ? creatorFullName(user) : "Unknown"
              const dotColor =
                selectedCreatorIds.length > 1 ? (chartConfig[id]?.color as string) : "var(--color-chart-1)"
              return (
                <Badge key={id} variant="secondary" className="gap-1.5 pr-1">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                  {name}
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-3xl font-semibold tabular-nums">
                      {isVisible ? formatCurrency(periodTotal) : MASKED_AMOUNT}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleVisibility}
                      aria-label={isVisible ? "Hide total sales" : "Show total sales"}
                    >
                      {isVisible ? <EyeIcon /> : <EyeOffIcon />}
                    </Button>
                  </div>
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
              <div
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  isUp
                    ? "bg-status-success/10 text-status-success"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {isUp ? <TrendingUpIcon className="size-3.5" /> : <TrendingDownIcon className="size-3.5" />}
                {Math.abs(changePct)}% vs previous period
              </div>
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
                        const isMulti = selectedCreatorIds.length > 1
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
                {selectedCreatorIds.length > 1 ? (
                  selectedCreatorIds.map((id) => (
                    <Area
                      key={id}
                      type="monotone"
                      dataKey={id}
                      name={id}
                      stroke={`var(--color-${id})`}
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  ))
                ) : (
                  <Area type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} fill="url(#salesFill)" />
                )}
                {selectedCreatorIds.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
