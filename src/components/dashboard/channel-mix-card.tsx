import { Share2Icon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ORDER_CHANNELS, useOrderStats } from "@/lib/orders"

const CHANNEL_BAR_COLOR = "var(--color-chart-2)"
const LEADER_BAR_COLOR = "var(--color-primary)"

export function ChannelMixCard() {
  const { stats, isLoading } = useOrderStats()

  const counts = ORDER_CHANNELS.map((channel) => ({
    channel,
    count: stats?.byChannel[channel] ?? 0,
  })).sort((a, b) => b.count - a.count)

  const total = stats?.totalOrders ?? 0
  const maxCount = Math.max(...counts.map((c) => c.count), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel mix</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {ORDER_CHANNELS.map((channel) => (
              <Skeleton key={channel} className="h-6 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <Share2Icon />
            </EmptyMedia>
            <EmptyTitle>No orders yet</EmptyTitle>
            <EmptyDescription>Channel breakdown appears once orders come in.</EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {counts.map((entry, index) => (
              <div key={entry.channel} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{entry.channel}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {entry.count} · {Math.round((entry.count / total) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn("h-2 rounded-full")}
                    style={{
                      width: `${(entry.count / maxCount) * 100}%`,
                      backgroundColor: index === 0 ? LEADER_BAR_COLOR : CHANNEL_BAR_COLOR,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
