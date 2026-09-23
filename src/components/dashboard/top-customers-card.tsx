import { UsersIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { IconBadge } from "@/components/icon-badge"
import { RANK_BADGE_CLASSES } from "@/lib/rank-badge"
import { cn, formatCurrency } from "@/lib/utils"
import { useCustomerRankings, useOrderActions } from "@/lib/orders"

const VISIBLE_COUNT = 6
const AVATAR_TONE_CLASSES = "bg-accent text-accent-foreground"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "").concat(parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "").toUpperCase()
}

export function TopCustomersCard() {
  const { customerNames, customerDetailsByName, windowDays, isLoading } = useCustomerRankings()
  const { setOrdersFilter } = useOrderActions()
  const navigate = useNavigate()

  const topCustomers = customerNames
    .slice(0, VISIBLE_COUNT)
    .map((name) => customerDetailsByName.get(name))
    .filter((customer) => customer !== undefined)
  const maxSpent = Math.max(...topCustomers.map((customer) => customer.totalSpent), 1)

  // Same drill-down as the other dashboard lists: prime the Orders list, then go there. The
  // server's order search matches customer_name, so this lands on that customer's orders.
  function viewCustomerOrders(customerName: string) {
    setOrdersFilter({ search: customerName, page: 1 })
    navigate("/orders")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconBadge icon={UsersIcon} size="sm" />
          <div className="min-w-0">
            <CardTitle>Top customers</CardTitle>
            <CardDescription>Ranked by total spend</CardDescription>
          </div>
        </div>
        {windowDays ? (
          <CardAction className="text-xs text-muted-foreground">Last {windowDays} days</CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: VISIBLE_COUNT }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b py-3 last:border-b-0">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-1 w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : topCustomers.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Not enough data yet</EmptyTitle>
            <EmptyDescription>Top customers appear once orders come in.</EmptyDescription>
          </Empty>
        ) : (
          // One shared grid (rank · avatar · name · total); each row is a two-line subgrid so the
          // names, totals and spend bars line up down the list.
          <ul className="-mx-2 grid grid-cols-[1.25rem_auto_minmax(0,1fr)_auto] gap-x-3">
            {topCustomers.map((customer, index) => {
              const rank = index + 1
              const sharePercent = Math.round((customer.totalSpent / maxSpent) * 100)
              const orderLabel = `${customer.orderCount} order${customer.orderCount === 1 ? "" : "s"}`
              return (
                <li key={customer.customerName} className="col-span-full grid grid-cols-subgrid border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => viewCustomerOrders(customer.customerName)}
                    aria-label={`${customer.customerName}, rank ${rank}, ${formatCurrency(customer.totalSpent)} from ${orderLabel} — view orders`}
                    className="group/row col-span-full grid cursor-pointer grid-cols-subgrid grid-rows-[auto_auto] items-center gap-y-1.5 rounded-md px-2 py-2.5 text-left text-sm transition-colors duration-200 ease-out outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {rank <= RANK_BADGE_CLASSES.length ? (
                      <span
                        className={cn(
                          "row-span-2 flex size-5 items-center justify-center rounded-full text-[0.65rem] font-semibold tabular-nums",
                          RANK_BADGE_CLASSES[index]
                        )}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span className="row-span-2 text-center text-xs text-muted-foreground tabular-nums">
                        {rank}
                      </span>
                    )}
                    <Avatar size="sm" className="row-span-2">
                      <AvatarFallback
                        className={cn(
                          AVATAR_TONE_CLASSES,
                          "font-semibold transition-transform duration-200 group-hover/row:scale-105 motion-reduce:group-hover/row:scale-100"
                        )}
                      >
                        {initials(customer.customerName)}
                      </AvatarFallback>
                    </Avatar>
                    <span title={customer.customerName} className="truncate leading-tight font-medium">
                      {customer.customerName}
                    </span>
                    <span className="text-right leading-tight font-semibold tabular-nums">
                      {formatCurrency(customer.totalSpent)}
                    </span>
                    {/* Line 2: order count, then the spend bar running out to under the total —
                        how this customer compares to #1. */}
                    <span className="col-span-2 col-start-3 flex items-center gap-3">
                      <span className="shrink-0 text-xs leading-none text-muted-foreground tabular-nums">
                        {orderLabel}
                      </span>
                      <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="bg-brand-gradient block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                          style={{ width: `${sharePercent}%` }}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
