import { PieChartIcon, TriangleAlertIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { EXPENSE_CATEGORIES } from "@/lib/expenses"
import { formatCurrency } from "@/lib/utils"

const CATEGORY_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]
const CATEGORY_LABEL_MAX_CHARS = 20
const LOADING_SKELETON_ROWS = 4

const chartConfig = { amount: { label: "Amount" } } satisfies ChartConfig

type CategoryRow = { category: string; amount: number; fill: string; labelText: string }

function truncateLabel(name: string): string {
  return name.length > CATEGORY_LABEL_MAX_CHARS ? `${name.slice(0, CATEGORY_LABEL_MAX_CHARS - 1)}…` : name
}

// Every fixed category is colored by its stable position in EXPENSE_CATEGORIES (not by rank), so a
// category's color never shifts just because another category's amount changed. Only categories
// with spend in this period are shown.
function buildExpenseCategoryRows(expensesByCategory: Record<string, number>): CategoryRow[] {
  return EXPENSE_CATEGORIES.map((category, index) => ({
    category,
    amount: expensesByCategory[category] ?? 0,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    labelText: formatCurrency(expensesByCategory[category] ?? 0),
  }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export function ExpenseBreakdownCard({
  expensesByCategory,
  isLoading,
  isError,
}: {
  expensesByCategory: Record<string, number>
  isLoading: boolean
  isError: boolean
}) {
  const rows = buildExpenseCategoryRows(expensesByCategory)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses by category</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: LOADING_SKELETON_ROWS }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load expense data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : rows.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <PieChartIcon />
            </EmptyMedia>
            <EmptyTitle>No expenses in this period</EmptyTitle>
            <EmptyDescription>The category breakdown appears once expenses are logged.</EmptyDescription>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 64 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value: number) => formatCurrency(value)} />
              <YAxis
                type="category"
                dataKey="category"
                tickLine={false}
                axisLine={false}
                width={110}
                interval={0}
                tickFormatter={(value: string) => truncateLabel(value)}
              />
              <ChartTooltip
                cursor={{ fill: "var(--color-muted)" }}
                content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
              />
              <Bar dataKey="amount" radius={4}>
                <LabelList dataKey="labelText" position="right" className="fill-muted-foreground text-xs" />
                {rows.map((row) => (
                  <Cell key={row.category} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
