import { Share2Icon, TriangleAlertIcon } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { MASKED_AMOUNT, useSalesVisibility } from "@/lib/sales-visibility"
import { formatCurrency } from "@/lib/utils"

const CHANNEL_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]
const OTHER_COLOR = "var(--color-muted-foreground)"
const MAX_INDIVIDUAL_CHANNELS = CHANNEL_COLORS.length - 1
const LOADING_LEGEND_ROWS = 4

const chartConfig = { amount: { label: "Revenue" } } satisfies ChartConfig

type ChannelRow = { channel: string; amount: number; fill: string; labelText: string; isOther?: boolean }

// Beyond CHANNEL_COLORS.length channels, the lowest-revenue ones fold into one muted "Other" row
// rather than inventing or cycling extra hues (mirrors ChannelMixCard's approach).
function buildRevenueChannelRows(revenueByChannel: Record<string, number>, isVisible: boolean): ChannelRow[] {
  const byAmountDesc = Object.entries(revenueByChannel)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])

  const individual = byAmountDesc.slice(0, MAX_INDIVIDUAL_CHANNELS)
  const overflow = byAmountDesc.slice(MAX_INDIVIDUAL_CHANNELS)

  const rows: ChannelRow[] = individual.map(([channel, amount], index) => ({
    channel,
    amount,
    fill: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
    labelText: isVisible ? formatCurrency(amount) : MASKED_AMOUNT,
  }))

  if (overflow.length > 0) {
    const otherAmount = overflow.reduce((sum, [, amount]) => sum + amount, 0)
    rows.push({
      channel: "Other",
      amount: otherAmount,
      fill: OTHER_COLOR,
      labelText: isVisible ? formatCurrency(otherAmount) : MASKED_AMOUNT,
      isOther: true,
    })
  }

  return rows
}

export function RevenueBreakdownCard({
  revenueByChannel,
  isLoading,
  isError,
}: {
  revenueByChannel: Record<string, number>
  isLoading: boolean
  isError: boolean
}) {
  const { isVisible } = useSalesVisibility()
  const rows = buildRevenueChannelRows(revenueByChannel, isVisible)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by channel</CardTitle>
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
            <EmptyTitle>Couldn't load revenue data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : rows.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <Share2Icon />
            </EmptyMedia>
            <EmptyTitle>No revenue in this period</EmptyTitle>
            <EmptyDescription>The channel breakdown appears once orders are paid.</EmptyDescription>
          </Empty>
        ) : (
          <div className="flex items-center gap-4">
            <ChartContainer config={chartConfig} className="aspect-square h-28 w-28 shrink-0">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="channel"
                      formatter={(value) => (isVisible ? formatCurrency(Number(value)) : MASKED_AMOUNT)}
                    />
                  }
                />
                <Pie data={rows} dataKey="amount" nameKey="channel" innerRadius={40} outerRadius={56} strokeWidth={3}>
                  {rows.map((row) => (
                    <Cell key={row.channel} fill={row.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              {rows.map((row) => (
                <div key={row.channel} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                    <span className="truncate" title={row.channel}>
                      {row.channel}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{row.labelText}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
