import { InboxIcon, TriangleAlertIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatRelativeDate } from "@/lib/utils"
import { useRecentOrders } from "@/lib/orders"

const VISIBLE_COUNT = 6

export function RecentOrdersCard() {
  const { recentOrders, isLoading, isError } = useRecentOrders()
  const orders = recentOrders.slice(0, VISIBLE_COUNT)

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
        <CardDescription>Newest activity across all channels</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: VISIBLE_COUNT }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load recent orders</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : orders.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <InboxIcon />
            </EmptyMedia>
            <EmptyTitle>No orders yet</EmptyTitle>
            <EmptyDescription>New orders will show up here.</EmptyDescription>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">
                    {order.orderNumber} · {order.customerName}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {formatRelativeDate(order.createdAt)} · {order.channel}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.payment.status} />
                  <span className="w-20 text-right font-medium tabular-nums">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
