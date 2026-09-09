import { PackageSearchIcon, TriangleAlertIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { DASHBOARD_EXCLUDED_STATUSES, ORDER_TERMINAL_STATUSES } from "@/lib/order-status"
import { useActiveOrderStatuses, useOrderStatusLookup } from "@/lib/order-statuses"
import { useOrderStats } from "@/lib/orders"

const chartConfig = { count: { label: "Orders" } } satisfies ChartConfig

export function StatusPipelineCard() {
  const { stats, isLoading, isError } = useOrderStats()
  const { statuses } = useActiveOrderStatuses()
  const { getLabel, getColors } = useOrderStatusLookup()

  const pipelineStages = statuses.filter(
    (s) => !ORDER_TERMINAL_STATUSES.includes(s.name) && !DASHBOARD_EXCLUDED_STATUSES.includes(s.name)
  )

  const cancelledCount = ORDER_TERMINAL_STATUSES.reduce(
    (sum, status) => sum + (stats?.byStatus[status] ?? 0),
    0
  )

  const data = pipelineStages.map((item) => ({
    status: item.name,
    label: getLabel(item.name),
    count: stats?.byStatus[item.name] ?? 0,
    fill: getColors(item.name).color,
  }))

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Order status pipeline</CardTitle>
        {cancelledCount > 0 ? (
          <CardAction>
            <Badge variant="destructive" className="gap-1">
              <TriangleAlertIcon data-icon="inline-start" />
              {cancelledCount} needs attention
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {pipelineStages.map((item) => (
              <Skeleton key={item.id} className="h-6 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load pipeline data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : !stats || stats.totalOrders === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <PackageSearchIcon />
            </EmptyMedia>
            <EmptyTitle>No orders yet</EmptyTitle>
            <EmptyDescription>New orders will appear here as they come in.</EmptyDescription>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <ChartTooltip
                cursor={{ fill: "var(--color-muted)" }}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="count" radius={4}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
