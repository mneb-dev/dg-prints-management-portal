import { ArrowRightIcon, InboxIcon, TriangleAlertIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import { TickingText } from "@/components/ticking-text"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatTimeAgo } from "@/lib/utils"
import { useOrderActions, useRecentOrders } from "@/lib/orders"
import type { Order } from "@/lib/orders"

const VISIBLE_COUNT = 6

// Customer/order · status · payment · total. Payment is dropped below `sm` — the "₱X due" line
// under the total still carries what's owed there.
const GRID_COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"

/** Still owed on an order — only for statuses that can carry a balance (not paid/refunded). */
function amountDue(order: Order): number {
  const { status, balance } = order.payment
  return status === "paid" || status === "refunded" ? 0 : Math.max(0, balance)
}

export function RecentOrdersCard() {
  const { recentOrders, isLoading, isError } = useRecentOrders()
  const { setOrdersFilter } = useOrderActions()
  const orders = recentOrders.slice(0, VISIBLE_COUNT)

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
        <CardDescription>Newest activity across all channels</CardDescription>
        <CardAction>
          {/* Clears any filter a dashboard card (pipeline, payments) primed on the Orders list,
              so "View all" really lands on the unfiltered list. */}
          <Button
            variant="ghost"
            size="sm"
            render={<Link to="/orders" />}
            nativeButton={false}
            onClick={() => setOrdersFilter({})}
            className="group/viewall text-muted-foreground hover:text-foreground"
          >
            View all
            <ArrowRightIcon
              data-icon="inline-end"
              className="transition-transform duration-200 group-hover/viewall:translate-x-0.5 motion-reduce:group-hover/viewall:translate-x-0"
            />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: VISIBLE_COUNT }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b py-3 last:border-b-0">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-20 rounded-4xl" />
                <Skeleton className="hidden h-5 w-20 rounded-4xl sm:block" />
                <Skeleton className="h-4 w-16" />
              </div>
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
          // One shared grid; the header and every row are subgrids, so chips and totals line up
          // down the list while each auto column sizes to its widest chip.
          <div className={`-mx-2 grid ${GRID_COLUMNS} items-center gap-x-4`}>
            <div className="col-span-full hidden grid-cols-subgrid border-b px-2 pb-2 text-xs font-medium text-muted-foreground sm:grid">
              <span>Customer / order</span>
              <span>Status</span>
              <span>Payment</span>
              <span className="text-right">Total</span>
            </div>
            {orders.map((order) => {
              const due = amountDue(order)
              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  aria-label={`Order ${order.orderNumber} for ${order.customerName}`}
                  className="col-span-full grid grid-cols-subgrid items-center rounded-md border-b px-2 py-2.5 text-sm transition-colors duration-200 ease-out outline-none last:border-b-0 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span title={order.customerName} className="truncate leading-tight font-medium">
                      {order.customerName}
                    </span>
                    <span className="truncate text-xs leading-tight text-muted-foreground">
                      <span className="tabular-nums">{order.orderNumber}</span>
                      {" · "}
                      <TickingText intervalMs={60_000} format={() => formatTimeAgo(order.createdAt)} />
                      {order.channel ? ` · ${order.channel}` : null}
                    </span>
                  </div>
                  <div className="flex">
                    <OrderStatusBadge status={order.status} statusUpdatedAt={order.statusUpdatedAt} />
                  </div>
                  <div className="hidden sm:flex">
                    <PaymentStatusBadge status={order.payment.status} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="leading-tight font-semibold tabular-nums">
                      {formatCurrency(order.total)}
                    </span>
                    {due > 0 ? (
                      <span className="text-xs leading-tight text-status-warning tabular-nums">
                        {formatCurrency(due)} due
                      </span>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
