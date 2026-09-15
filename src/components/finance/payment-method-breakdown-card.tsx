import { CreditCardIcon, TriangleAlertIcon } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { MASKED_AMOUNT, useSalesVisibility } from "@/lib/sales-visibility"
import { formatCurrency } from "@/lib/utils"

const METHOD_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]
const OTHER_COLOR = "var(--color-muted-foreground)"
const MAX_INDIVIDUAL_METHODS = METHOD_COLORS.length - 1
const LOADING_LEGEND_ROWS = 4

const chartConfig = { amount: { label: "Revenue" } } satisfies ChartConfig

type PaymentMethodRow = { method: string; amount: number; percent: number; fill: string; isOther?: boolean }

// Beyond METHOD_COLORS.length methods, the lowest-revenue ones fold into one muted "Other" slice
// rather than inventing or cycling extra hues (mirrors RevenueBreakdownCard's approach).
function buildPaymentMethodRows(revenueByPaymentMethod: Record<string, number>): PaymentMethodRow[] {
  const total = Object.values(revenueByPaymentMethod).reduce((sum, amount) => sum + amount, 0)
  const byAmountDesc = Object.entries(revenueByPaymentMethod)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])

  const individual = byAmountDesc.slice(0, MAX_INDIVIDUAL_METHODS)
  const overflow = byAmountDesc.slice(MAX_INDIVIDUAL_METHODS)

  function toRow(method: string, amount: number, fill: string): PaymentMethodRow {
    const percent = total > 0 ? Math.round((amount / total) * 100) : 0
    return { method, amount, percent, fill }
  }

  const rows = individual.map(([method, amount], index) => toRow(method, amount, METHOD_COLORS[index % METHOD_COLORS.length]))

  if (overflow.length > 0) {
    const otherAmount = overflow.reduce((sum, [, amount]) => sum + amount, 0)
    rows.push({ ...toRow("Other", otherAmount, OTHER_COLOR), isOther: true })
  }

  return rows
}

export function PaymentMethodBreakdownCard({
  revenueByPaymentMethod,
  isLoading,
  isError,
}: {
  revenueByPaymentMethod: Record<string, number>
  isLoading: boolean
  isError: boolean
}) {
  const { isVisible } = useSalesVisibility()
  const rows = buildPaymentMethodRows(revenueByPaymentMethod)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by payment method</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="mx-auto h-40 w-40 rounded-full" />
            <div className="flex w-full flex-col gap-3">
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
            <EmptyTitle>Couldn't load payment method data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : rows.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <CreditCardIcon />
            </EmptyMedia>
            <EmptyTitle>No revenue in this period</EmptyTitle>
            <EmptyDescription>The payment method breakdown appears once orders are paid.</EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-52 w-full">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="method"
                      formatter={(value) => (isVisible ? formatCurrency(Number(value)) : MASKED_AMOUNT)}
                    />
                  }
                />
                <Pie data={rows} dataKey="amount" nameKey="method" innerRadius={58} outerRadius={84} strokeWidth={3}>
                  {rows.map((row) => (
                    <Cell key={row.method} fill={row.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex w-full flex-col gap-2 text-sm">
              {rows.map((row) => (
                <div key={row.method} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                    <span className="truncate" title={row.method}>
                      {row.method}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {row.percent}% · {isVisible ? formatCurrency(row.amount) : MASKED_AMOUNT}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
