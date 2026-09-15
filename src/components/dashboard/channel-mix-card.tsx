import { Share2Icon, TriangleAlertIcon } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useEnabledOrderChannels } from "@/lib/order-channels"
import { useOrderStats } from "@/lib/orders"

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

const chartConfig = { count: { label: "Orders" } } satisfies ChartConfig

type ChannelMixRow = {
  channel: string
  count: number
  percent: number
  fill: string
  labelText: string
  isOther?: boolean
  otherChannelCount?: number
}

/** Merges the enabled channel catalog with historical order counts so every current channel shows
 * (even at zero orders), while a channel that's since been renamed/disabled in Settings still shows
 * up if it has real historical orders ("orphan" channels below). A channel's color is keyed to its
 * stable position in that merged list, not to its count-rank, so it doesn't shift as counts change.
 * Beyond `CHANNEL_COLORS.length` channels, the lowest-count ones fold into one muted "Other" row
 * rather than inventing or cycling extra hues. */
function buildChannelMixRows(
  enabledChannels: string[],
  byChannel: Record<string, number>,
  totalOrders: number
): ChannelMixRow[] {
  const enabledSet = new Set(enabledChannels)
  const orphanNames = Object.keys(byChannel)
    .filter((name) => !enabledSet.has(name))
    .sort((a, b) => a.localeCompare(b))
  const channelOrder = [...enabledChannels, ...orphanNames]

  const withCounts = channelOrder.map((channel, identityIndex) => ({
    channel,
    count: byChannel[channel] ?? 0,
    identityIndex,
  }))

  let individual = withCounts
  let other: { count: number; otherChannelCount: number } | null = null

  if (withCounts.length > CHANNEL_COLORS.length) {
    const byCountDesc = [...withCounts].sort((a, b) => b.count - a.count)
    individual = byCountDesc.slice(0, MAX_INDIVIDUAL_CHANNELS)
    const overflow = byCountDesc.slice(MAX_INDIVIDUAL_CHANNELS)
    other = {
      count: overflow.reduce((sum, entry) => sum + entry.count, 0),
      otherChannelCount: overflow.length,
    }
  }

  const colorByIdentityIndex = new Map(
    [...individual]
      .sort((a, b) => a.identityIndex - b.identityIndex)
      .map((entry, colorIndex) => [entry.identityIndex, CHANNEL_COLORS[colorIndex]])
  )

  function toRow(channel: string, count: number, fill: string): ChannelMixRow {
    const percent = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
    return { channel, count, percent, fill, labelText: `${count} · ${percent}%` }
  }

  const rows = individual
    .map((entry) => toRow(entry.channel, entry.count, colorByIdentityIndex.get(entry.identityIndex) ?? OTHER_COLOR))
    .sort((a, b) => b.count - a.count)

  if (other) {
    rows.push({
      ...toRow("Other", other.count, OTHER_COLOR),
      isOther: true,
      otherChannelCount: other.otherChannelCount,
    })
  }

  return rows
}

export function ChannelMixCard() {
  const { stats, isLoading: statsLoading, isError } = useOrderStats()
  const { orderChannels: enabledChannels, isLoading: channelsLoading } = useEnabledOrderChannels()
  const isLoading = statsLoading || channelsLoading

  const total = stats?.totalOrders ?? 0
  const rows = buildChannelMixRows(enabledChannels, stats?.byChannel ?? {}, total)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel mix</CardTitle>
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
            <EmptyTitle>Couldn't load channel data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : !stats || total === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <Share2Icon />
            </EmptyMedia>
            <EmptyTitle>No orders yet</EmptyTitle>
            <EmptyDescription>Channel breakdown appears once orders come in.</EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-52 w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="channel" />} />
                <Pie data={rows} dataKey="count" nameKey="channel" innerRadius={58} outerRadius={84} strokeWidth={3}>
                  {rows.map((row) => (
                    <Cell key={row.channel} fill={row.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex w-full flex-col gap-2 text-sm">
              {rows.map((row) => (
                <div key={row.channel} className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                  <span className="min-w-0 flex-1 truncate" title={row.channel}>
                    {row.channel}
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-medium tabular-nums">{row.labelText}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
