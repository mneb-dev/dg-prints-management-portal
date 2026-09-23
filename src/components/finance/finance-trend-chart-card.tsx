import { format, parseISO } from "date-fns"
import { LineChartIcon, TriangleAlertIcon } from "lucide-react"
import { useMemo, type ReactNode } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Money } from "@/components/money"
import { IconBadge } from "@/components/icon-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { PeriodRange } from "@/lib/finance-period"
import { MASKED_AMOUNT, useSalesVisibility } from "@/lib/sales-visibility"
import { cn, formatCurrency } from "@/lib/utils"
import type { FinanceSeriesPoint } from "@/lib/finance"

const chartConfig = {
  revenue: { label: "Revenue", color: "var(--color-chart-1)" },
  expenses: { label: "Expenses", color: "var(--color-chart-2)" },
} satisfies ChartConfig

export function FinanceTrendChartCard({
  range,
  series,
  totals,
  isLoading,
  isError,
}: {
  range: PeriodRange | null
  series: FinanceSeriesPoint[]
  /** Period totals from the finance summary, shown as the chart's legend. */
  totals: { revenue: number; expenses: number; net: number }
  isLoading: boolean
  isError: boolean
}) {
  const { isVisible } = useSalesVisibility()
  const masked = (amount: number) => <Money amount={amount} hidden={!isVisible} />

  const chartData = useMemo(
    () =>
      series.map((point) => ({
        label: format(parseISO(point.date), "MMM d"),
        revenue: point.revenue,
        expenses: point.expenses,
      })),
    [series],
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={LineChartIcon} size="sm" />
          <div className="min-w-0">
            <CardTitle>Revenue vs. expenses</CardTitle>
            <CardDescription className="truncate">Daily totals for the selected period</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {range && !isLoading && !isError ? (
          // Totals legend: the numbers are readable without hovering the chart.
          <dl className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
            <LegendTotal color={chartConfig.revenue.color} label="Revenue" value={masked(totals.revenue)} />
            <LegendTotal
              color={chartConfig.expenses.color}
              label="Expenses"
              value={<Money amount={totals.expenses} hidden={false} />}
            />
            <LegendTotal
              label="Net"
              value={masked(totals.net)}
              valueClassName={isVisible && totals.net < 0 ? "text-destructive" : undefined}
            />
          </dl>
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
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function LegendTotal({
  color,
  label,
  value,
  valueClassName,
}: {
  color?: string
  label: string
  value: ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {color ? (
          <span aria-hidden className="size-2 shrink-0 translate-y-px rounded-full" style={{ backgroundColor: color }} />
        ) : null}
        {label}
      </dt>
      <dd className={cn("font-semibold tabular-nums", valueClassName)}>{value}</dd>
    </div>
  )
}
