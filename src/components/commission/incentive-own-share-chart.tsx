import { PieChartIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { MonthlyIncentiveOwnShare } from "@/lib/commission"
import { cn, formatCurrency } from "@/lib/utils"

const chartConfig = {
  you: { label: "You", color: "var(--color-chart-1)" },
  team: { label: "Rest of the team", color: "var(--color-chart-2)" },
} satisfies ChartConfig

export function IncentiveOwnShareChart({
  periodLabel,
  ownShare,
  pool,
  isLoading,
  isError,
  comparisonPercent,
}: {
  periodLabel: string
  ownShare: MonthlyIncentiveOwnShare | null
  pool: number
  isLoading: boolean
  isError: boolean
  /** When provided, shows a "+X% vs last month" pill next to the earned amount. Omit on the
   * previous-month card itself, which has nothing further back to compare against here. */
  comparisonPercent?: number | null
}) {
  const hasShare = !!ownShare && pool > 0 && ownShare.commissionShare > 0
  const restOfTeam = hasShare ? Math.max(pool - ownShare!.commissionShare, 0) : 0
  const data = hasShare
    ? [
        { name: "you", value: ownShare!.commissionShare, fill: "var(--color-chart-1)" },
        { name: "team", value: restOfTeam, fill: "var(--color-chart-2)" },
      ]
    : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your incentive — {periodLabel}</CardTitle>
        <CardDescription>Your share of the team's incentive pool</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="mx-auto h-52 w-52 rounded-full" />
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <PieChartIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load this period</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : !hasShare ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <PieChartIcon />
            </EmptyMedia>
            <EmptyTitle>No incentive earned</EmptyTitle>
            <EmptyDescription>
              {pool <= 0 ? "The team didn't unlock a tier this period." : "No eligible sales logged this period."}
            </EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-52 w-full">
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(Number(value))} />}
                />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} strokeWidth={3}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold tabular-nums">{formatCurrency(ownShare!.commissionShare)}</span>
                {comparisonPercent != null ? (
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      comparisonPercent >= 0
                        ? "bg-status-success/10 text-status-success"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {comparisonPercent >= 0 ? (
                      <TrendingUpIcon className="size-3.5" />
                    ) : (
                      <TrendingDownIcon className="size-3.5" />
                    )}
                    {Math.abs(Math.round(comparisonPercent))}% vs last month
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">
                {ownShare!.percentageShare.toFixed(1)}% of the team's sales this period
              </span>
            </div>

            <div className="flex w-full flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--color-chart-1)" }} />
                  You
                </span>
                <span className="font-medium tabular-nums">{formatCurrency(ownShare!.commissionShare)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--color-chart-2)" }} />
                  Rest of the team
                </span>
                <span className="tabular-nums">{formatCurrency(restOfTeam)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
