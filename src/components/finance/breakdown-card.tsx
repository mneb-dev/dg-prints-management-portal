import type { LucideIcon } from "lucide-react"
import { TriangleAlertIcon } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"

import { Money } from "@/components/money"
import { IconBadge } from "@/components/icon-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { MASKED_AMOUNT } from "@/lib/sales-visibility"
import { formatCurrency } from "@/lib/utils"

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]
const OTHER_COLOR = "var(--color-muted-foreground)"
const MAX_INDIVIDUAL = COLORS.length - 1
const LOADING_LEGEND_ROWS = 4

const chartConfig = { amount: { label: "Amount" } } satisfies ChartConfig

type BreakdownRow = { name: string; amount: number; percent: number; fill: string }

/** Largest first; beyond MAX_INDIVIDUAL entries the smallest fold into one muted "Other" row
 * rather than inventing or cycling extra hues. With `order`, an entry's color comes from its stable
 * position in that list (so it doesn't shift when another amount changes); otherwise from rank. */
function buildRows(data: Record<string, number>, order?: readonly string[]): BreakdownRow[] {
  const total = Object.values(data).reduce((sum, amount) => sum + amount, 0)
  const byAmountDesc = Object.entries(data)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
  const individual = byAmountDesc.slice(0, MAX_INDIVIDUAL)
  const overflow = byAmountDesc.slice(MAX_INDIVIDUAL)
  const percentOf = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0)

  const rows = individual.map(([name, amount], rank) => {
    const position = order ? order.indexOf(name) : -1
    return {
      name,
      amount,
      percent: percentOf(amount),
      fill: COLORS[(position >= 0 ? position : rank) % COLORS.length],
    }
  })
  if (overflow.length > 0) {
    const otherAmount = overflow.reduce((sum, [, amount]) => sum + amount, 0)
    rows.push({ name: "Other", amount: otherAmount, percent: percentOf(otherAmount), fill: OTHER_COLOR })
  }
  return rows
}

/** Donut + legend breakdown of an amount across a few named buckets (expense categories, order
 * channels, payment methods) — one shape for every Finance breakdown. `masked` hides amounts when
 * the sales-visibility toggle is off; percentages stay visible. */
export function BreakdownCard({
  icon,
  title,
  description,
  data,
  order,
  masked = false,
  isLoading,
  isError,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
}: {
  icon: LucideIcon
  title: string
  description: string
  data: Record<string, number>
  order?: readonly string[]
  masked?: boolean
  isLoading: boolean
  isError: boolean
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription: string
}) {
  const rows = buildRows(data, order)
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  const money = (amount: number) => <Money amount={amount} hidden={masked} />

  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={icon} size="sm" />
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="truncate">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="size-28 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {Array.from({ length: LOADING_LEGEND_ROWS }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load this breakdown</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : rows.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <EmptyIcon />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </Empty>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative size-28 shrink-0">
              <ChartContainer config={chartConfig} className="aspect-square size-28">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent hideLabel nameKey="name" formatter={(value) => (masked ? MASKED_AMOUNT : formatCurrency(Number(value)))} />
                    }
                  />
                  <Pie data={rows} dataKey="amount" nameKey="name" innerRadius={40} outerRadius={56} strokeWidth={3}>
                    {rows.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] leading-none text-muted-foreground">Total</span>
                <span className="mt-0.5 max-w-18 truncate text-xs leading-tight font-semibold tabular-nums">
                  <Money amount={total} hidden={masked} format={compactCurrency} />
                </span>
              </div>
            </div>

            <ul className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              {rows.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className="size-2 shrink-0 translate-y-px rounded-full" style={{ backgroundColor: row.fill }} />
                    <span className="truncate leading-none" title={row.name}>
                      {row.name}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                    <span className="font-medium">{money(row.amount)}</span>
                    <span className="w-8 text-right text-xs text-muted-foreground">{row.percent}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** "₱12.4k" / "₱1.2M" — fits the donut's centre; the legend carries the exact amounts. */
function compactCurrency(amount: number): string {
  return `₱${new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 }).format(amount)}`
}
