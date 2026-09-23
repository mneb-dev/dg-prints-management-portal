import { useState } from "react"
import { Share2Icon, TriangleAlertIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Cell, Pie, PieChart } from "recharts"

import { IconBadge } from "@/components/icon-badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useEnabledOrderChannels } from "@/lib/order-channels"
import { useOrderActions, useOrderStats } from "@/lib/orders"
import { cn } from "@/lib/utils"

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
    return { channel, count, percent, fill }
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

/** A channel with real orders never reads as "0%" just because it rounds down. */
function formatPercent(row: ChannelMixRow): string {
  return row.count > 0 && row.percent === 0 ? "<1%" : `${row.percent}%`
}

const FADED_SLICE_OPACITY = 0.35

export function ChannelMixCard() {
  const { stats, isLoading: statsLoading, isError } = useOrderStats()
  const { orderChannels: enabledChannels, isLoading: channelsLoading } = useEnabledOrderChannels()
  const { setOrdersFilter } = useOrderActions()
  const navigate = useNavigate()
  const isLoading = statsLoading || channelsLoading
  // Shared by the donut and the legend: hovering either one highlights the same channel in both.
  const [activeChannel, setActiveChannel] = useState<string | null>(null)

  const total = stats?.totalOrders ?? 0
  const rows = buildChannelMixRows(enabledChannels, stats?.byChannel ?? {}, total)
  // Zero-order channels stay in the legend but get no slice, so padding/rounding never adds a
  // phantom gap — and a single-channel ring stays a clean, unbroken circle.
  const pieRows = rows.filter((row) => row.count > 0)
  const hasMultipleSlices = pieRows.length > 1

  function viewChannelOrders(channel: string) {
    setOrdersFilter({ channel, page: 1 })
    navigate("/orders")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconBadge icon={Share2Icon} size="sm" />
          <div className="min-w-0">
            <CardTitle>Channel mix</CardTitle>
            <CardDescription>Where orders come from</CardDescription>
          </div>
        </div>
        <CardAction className="text-xs text-muted-foreground">All time</CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="size-28 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
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
          <div className="flex items-center gap-4">
            <div className="relative size-28 shrink-0">
              <ChartContainer config={chartConfig} className="relative z-10 aspect-square size-28">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        nameKey="channel"
                        formatter={(value, _name, item) => {
                          const row = item?.payload as ChannelMixRow | undefined
                          return `${value} orders · ${row ? formatPercent(row) : "0%"}`
                        }}
                      />
                    }
                  />
                  <Pie
                    data={pieRows}
                    dataKey="count"
                    nameKey="channel"
                    innerRadius={40}
                    outerRadius={56}
                    stroke="var(--color-card)"
                    strokeWidth={2}
                    paddingAngle={hasMultipleSlices ? 2 : 0}
                    cornerRadius={hasMultipleSlices ? 3 : 0}
                    onMouseEnter={(_data, index) => setActiveChannel(pieRows[index]?.channel ?? null)}
                    onMouseLeave={() => setActiveChannel(null)}
                  >
                    {pieRows.map((row) => (
                      <Cell
                        key={row.channel}
                        fill={row.fill}
                        fillOpacity={activeChannel && activeChannel !== row.channel ? FADED_SLICE_OPACITY : 1}
                        className="transition-[fill-opacity] duration-200 ease-out outline-none motion-reduce:transition-none"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              {/* Total in the donut hole. Sits under the chart (z-10 above) so the hover tooltip is never
                  covered; the hole is transparent, so the label still shows through. */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl leading-none font-semibold tabular-nums">{total.toLocaleString()}</span>
                <span className="mt-1 text-xs leading-none text-muted-foreground">
                  {total === 1 ? "order" : "orders"}
                </span>
              </div>
            </div>

            <ul className="-mx-2 flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
              {rows.map((row) => {
                const label = row.isOther ? `Other (${row.otherChannelCount})` : row.channel
                const isClickable = !row.isOther && row.count > 0
                const isActive = activeChannel === row.channel
                const content = (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 translate-y-px rounded-full"
                        style={{ backgroundColor: row.fill }}
                      />
                      <span className="truncate leading-none" title={label}>
                        {label}
                      </span>
                    </span>
                    <span className="shrink-0 leading-none font-semibold tabular-nums">{formatPercent(row)}</span>
                  </>
                )
                const rowClassName = cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-200 ease-out",
                  isActive && "bg-accent/60",
                  row.count === 0 && "opacity-60"
                )
                const hoverProps = {
                  onMouseEnter: () => row.count > 0 && setActiveChannel(row.channel),
                  onMouseLeave: () => setActiveChannel(null),
                }
                return (
                  <li key={row.channel}>
                    {isClickable ? (
                      <button
                        type="button"
                        onClick={() => viewChannelOrders(row.channel)}
                        onFocus={() => setActiveChannel(row.channel)}
                        onBlur={() => setActiveChannel(null)}
                        aria-label={`${label}: ${formatPercent(row)} of orders — view orders`}
                        className={cn(
                          rowClassName,
                          "cursor-pointer outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                        )}
                        {...hoverProps}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={rowClassName} {...hoverProps}>
                        {content}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
