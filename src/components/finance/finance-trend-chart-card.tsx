import { format, parseISO } from "date-fns"
import { EyeIcon, EyeOffIcon, LineChartIcon, TriangleAlertIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PERIOD_PRESET_LABELS, PERIOD_PRESETS, type PeriodPreset, type PeriodRange } from "@/lib/finance-period"
import { useSalesVisibility } from "@/lib/sales-visibility"
import { formatCurrency } from "@/lib/utils"
import type { FinanceSeriesPoint } from "@/lib/finance"

const MASKED_AMOUNT = "₱****"

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--color-chart-1)" },
  expenses: { label: "Expenses", color: "var(--color-chart-2)" },
} satisfies ChartConfig

export function FinanceTrendChartCard({
  preset,
  onPresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  range,
  series,
  isLoading,
  isError,
}: {
  preset: PeriodPreset
  onPresetChange: (preset: PeriodPreset) => void
  customFrom: string
  onCustomFromChange: (value: string) => void
  customTo: string
  onCustomToChange: (value: string) => void
  range: PeriodRange | null
  series: FinanceSeriesPoint[]
  isLoading: boolean
  isError: boolean
}) {
  const { isVisible, toggleVisibility } = useSalesVisibility()

  const chartData = series.map((point) => ({
    label: format(parseISO(point.date), "MMM d"),
    revenue: point.revenue,
    expenses: point.expenses,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue vs. expenses</CardTitle>
        <CardDescription>Daily trend for the selected period</CardDescription>
        <CardAction className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleVisibility}
            aria-label={isVisible ? "Hide amounts" : "Show amounts"}
          >
            {isVisible ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
          <Select value={preset} onValueChange={(value) => value && onPresetChange(value as PeriodPreset)}>
            <SelectTrigger size="sm" className="text-xs">
              <SelectValue>{(value: string | null) => PERIOD_PRESET_LABELS[(value as PeriodPreset) ?? "this_month"]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PERIOD_PRESETS.map((value) => (
                <SelectItem key={value} value={value}>
                  {PERIOD_PRESET_LABELS[value]}
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
              <Label htmlFor="finance-date-from" className="text-sm text-muted-foreground">
                From
              </Label>
              <Popover>
                <PopoverTrigger
                  id="finance-date-from"
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
                    onSelect={(date) => onCustomFromChange(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={[{ after: new Date() }, ...(customTo ? [{ after: parseISO(customTo) }] : [])]}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Label htmlFor="finance-date-to" className="text-sm text-muted-foreground">
                To
              </Label>
              <Popover>
                <PopoverTrigger
                  id="finance-date-to"
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
                    onSelect={(date) => onCustomToChange(date ? format(date, "yyyy-MM-dd") : "")}
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
            <EmptyDescription>Select both a start and end date to see the trend for that period.</EmptyDescription>
          </Empty>
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load finance data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : chartData.every((point) => point.revenue === 0 && point.expenses === 0) ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <LineChartIcon />
            </EmptyMedia>
            <EmptyTitle>No activity in this period</EmptyTitle>
            <EmptyDescription>Revenue and expenses will appear here once recorded.</EmptyDescription>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <AreaChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="financeRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="financeExpensesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) => (isVisible ? formatCurrency(value) : MASKED_AMOUNT)}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--color-border)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const key = String(name)
                      const displayName = chartConfig[key as keyof typeof chartConfig]?.label ?? key
                      const swatch = chartConfig[key as keyof typeof chartConfig]?.color as string
                      return (
                        <div className="flex w-full items-center gap-2">
                          <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: swatch }} />
                          <span className="flex-1 text-muted-foreground">{displayName}</span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {isVisible ? formatCurrency(Number(value)) : MASKED_AMOUNT}
                          </span>
                        </div>
                      )
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                fill="url(#financeRevenueFill)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="var(--color-expenses)"
                strokeWidth={2}
                fill="url(#financeExpensesFill)"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
