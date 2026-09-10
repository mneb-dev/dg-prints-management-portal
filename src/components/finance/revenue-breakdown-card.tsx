import { Share2Icon, TriangleAlertIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useSalesVisibility } from "@/lib/sales-visibility"
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
const CHANNEL_LABEL_MAX_CHARS = 14
const LOADING_SKELETON_ROWS = 4
const MASKED_AMOUNT = "₱****"

const chartConfig = { amount: { label: "Revenue" } } satisfies ChartConfig

type ChannelRow = { channel: string; amount: number; fill: string; labelText: string; isOther?: boolean }

function truncateLabel(name: string): string {
  return name.length > CHANNEL_LABEL_MAX_CHARS ? `${name.slice(0, CHANNEL_LABEL_MAX_CHARS - 1)}…` : name
}

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
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 64 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => (isVisible ? formatCurrency(value) : MASKED_AMOUNT)}
              />
              <YAxis
                type="category"
                dataKey="channel"
                tickLine={false}
                axisLine={false}
                width={96}
                interval={0}
                tickFormatter={(value: string) => truncateLabel(value)}
              />
              <ChartTooltip
                cursor={{ fill: "var(--color-muted)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value) => (isVisible ? formatCurrency(Number(value)) : MASKED_AMOUNT)}
                  />
                }
              />
              <Bar dataKey="amount" radius={4}>
                <LabelList dataKey="labelText" position="right" className="fill-muted-foreground text-xs" />
                {rows.map((row) => (
                  <Cell key={row.channel} fill={row.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
