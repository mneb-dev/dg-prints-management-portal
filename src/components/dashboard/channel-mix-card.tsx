import { Share2Icon, TriangleAlertIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"

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
const CHANNEL_LABEL_MAX_CHARS = 14
const LOADING_SKELETON_ROWS = 4

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

function truncateChannelLabel(name: string): string {
  return name.length > CHANNEL_LABEL_MAX_CHARS
    ? `${name.slice(0, CHANNEL_LABEL_MAX_CHARS - 1)}…`
    : name
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
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 56 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="channel"
                tickLine={false}
                axisLine={false}
                width={96}
                interval={0}
                tickFormatter={(value: string) => truncateChannelLabel(value)}
              />
              <ChartTooltip cursor={{ fill: "var(--color-muted)" }} content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={4}>
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
