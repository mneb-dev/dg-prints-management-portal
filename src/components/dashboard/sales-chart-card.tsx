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
import { LineChartIcon, TrendingDownIcon, TrendingUpIcon, TriangleAlertIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesOrders } from "@/lib/orders"
import type { Order } from "@/lib/orders"
import { cn, formatCurrency } from "@/lib/utils"

type PeriodPreset = "this_week" | "this_month" | "last_3_months" | "last_6_months" | "this_year" | "custom"
type BucketUnit = "day" | "week" | "month"
type SalesPoint = { label: string; total: number }
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

// This card is only ever rendered for admin/superadmin (gated in dashboard-page.tsx) — staff
// don't see it at all, so every preset is available here.
const PRESETS: PeriodPreset[] = [
  "this_week",
  "this_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "custom",
]

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

function buildSeries(orders: Order[], range: PeriodRange, unit: BucketUnit): SalesPoint[] {
  const { currentStart, currentEnd } = range

  if (unit === "day") {
    return eachDayOfInterval({ start: currentStart, end: currentEnd }).map((day) => ({
      label: format(day, "MMM d"),
      total: sumOrdersInRange(orders, startOfDay(day), endOfDay(day)),
    }))
  }

  if (unit === "week") {
    return eachWeekOfInterval({ start: currentStart, end: currentEnd }, { weekStartsOn: 1 }).map(
      (weekStart) => ({
        label: format(weekStart, "MMM d"),
        total: sumOrdersInRange(orders, weekStart, endOfWeek(weekStart, { weekStartsOn: 1 })),
      })
    )
  }

  const spansMultipleYears = getYear(currentStart) !== getYear(currentEnd)
  return eachMonthOfInterval({ start: currentStart, end: currentEnd }).map((monthStart) => ({
    label: format(monthStart, spansMultipleYears ? "MMM yyyy" : "MMM"),
    total: sumOrdersInRange(orders, monthStart, endOfMonth(monthStart)),
  }))
}

const chartConfig = {
  total: { label: "Sales", color: "var(--color-chart-1)" },
} satisfies ChartConfig

export function SalesChartCard() {
  const [preset, setPreset] = useState<PeriodPreset>("this_week")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

  const range = useMemo(
    () => computePeriodRange(preset, customFrom, customTo, new Date()),
    [preset, customFrom, customTo]
  )

  const dateFrom = range ? format(range.previousStart, "yyyy-MM-dd") : ""
  const dateTo = range ? format(range.currentEnd, "yyyy-MM-dd") : ""
  const { salesOrders, isLoading, isError, isPossiblyTruncated } = useSalesOrders(dateFrom, dateTo)

  const { currentOrders, previousOrders } = useMemo(() => {
    if (!range) return { currentOrders: [] as Order[], previousOrders: [] as Order[] }
    const current: Order[] = []
    const previous: Order[] = []
    for (const order of salesOrders) {
      const createdAt = new Date(order.createdAt)
      ;(createdAt >= range.currentStart ? current : previous).push(order)
    }
    return { currentOrders: current, previousOrders: previous }
  }, [salesOrders, range])

  const bucketUnit = range ? pickBucketUnit(range.currentStart, range.currentEnd) : "day"
  const series = useMemo(
    () => (range ? buildSeries(currentOrders, range, bucketUnit) : []),
    [currentOrders, range, bucketUnit]
  )

  const periodTotal = currentOrders.reduce((sum, order) => sum + order.total, 0)
  const previousTotal = previousOrders.reduce((sum, order) => sum + order.total, 0)
  const changePct =
    previousTotal > 0
      ? Math.round(((periodTotal - previousTotal) / previousTotal) * 100)
      : periodTotal > 0
        ? 100
        : 0
  const isUp = changePct >= 0

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Sales overview</CardTitle>
        <CardDescription>Revenue trend for the selected period</CardDescription>
        <CardAction>
          <Select value={preset} onValueChange={(value) => value && setPreset(value as PeriodPreset)}>
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue>
                {(value: string | null) => PRESET_LABELS[(value as PeriodPreset) ?? "this_week"]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((value) => (
                <SelectItem key={value} value={value}>
                  {PRESET_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        ) : currentOrders.length === 0 ? (
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
                <span className="text-3xl font-semibold tabular-nums">{formatCurrency(periodTotal)}</span>
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
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--color-border)" }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <div className="flex w-full items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: "var(--color-chart-1)" }}
                          />
                          <span className="flex-1 text-muted-foreground">Sales</span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatCurrency(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-total)"
                  strokeWidth={2}
                  fill="url(#salesFill)"
                />
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  )
}
