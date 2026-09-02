import { PackageSearchIcon, TriangleAlertIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
} from "@/components/orders/order-status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ORDER_TERMINAL_STATUSES } from "@/lib/order-status"
import { useOrderStats } from "@/lib/orders"
import type { OrderStatus } from "@/lib/orders"

const PIPELINE_STAGES: OrderStatus[] = [
  "pending",
  "layout",
  "trace",
  "print",
  "cut",
  "pack",
  "pickup",
  "released",
]

const VARIANT_COLOR_VAR: Record<string, string> = {
  secondary: "var(--color-muted-foreground)",
  info: "var(--color-status-info)",
  progress: "var(--color-status-progress)",
  ready: "var(--color-status-ready)",
  success: "var(--color-status-success)",
}

const chartConfig = { count: { label: "Orders" } } satisfies ChartConfig

export function StatusPipelineCard() {
  const { stats, isLoading, isError } = useOrderStats()

  const cancelledCount = ORDER_TERMINAL_STATUSES.reduce(
    (sum, status) => sum + (stats?.byStatus[status] ?? 0),
    0
  )

  const data = PIPELINE_STAGES.map((status) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    count: stats?.byStatus[status] ?? 0,
    fill: VARIANT_COLOR_VAR[ORDER_STATUS_VARIANTS[status]] ?? "var(--color-muted-foreground)",
  }))

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Order status pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {PIPELINE_STAGES.map((status) => (
              <Skeleton key={status} className="h-6 w-full" />
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
          <>
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
            {cancelledCount > 0 ? (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <span className="text-sm text-muted-foreground">Needs attention</span>
                <Badge variant="destructive">
                  {cancelledCount} cancelled / refunded
                </Badge>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
