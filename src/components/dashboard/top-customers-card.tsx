import { UsersIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { useCustomerRankings } from "@/lib/orders"

const RANK_BADGE_CLASSES = [
  "bg-status-warning text-white",
  "bg-muted-foreground/70 text-white",
  "bg-status-progress/80 text-white",
] as const

const AVATAR_TONE_CLASSES = [
  "bg-primary/15 text-primary",
  "bg-status-info/15 text-status-info",
  "bg-status-success/15 text-status-success",
  "bg-status-progress/15 text-status-progress",
  "bg-status-ready/15 text-status-ready",
  "bg-status-warning/15 text-status-warning",
] as const

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "").concat(parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "").toUpperCase()
}

function avatarTone(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_TONE_CLASSES[hash % AVATAR_TONE_CLASSES.length]
}

export function TopCustomersCard() {
  const { customerNames, customerDetailsByName, isLoading } = useCustomerRankings()
  const topCustomers = customerNames
    .slice(0, 6)
    .map((name) => customerDetailsByName.get(name))
    .filter((customer) => customer !== undefined)
  const maxSpent = Math.max(...topCustomers.map((customer) => customer.totalSpent), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top customers</CardTitle>
        <CardDescription>Ranked by total spend</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
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
          <ul className="flex flex-col gap-1.5">
            {topCustomers.map((customer, index) => (
              <li
                key={customer.customerName}
                className="flex flex-col gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-3 text-sm">
                  {index < 3 ? (
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold tabular-nums",
                        RANK_BADGE_CLASSES[index]
                      )}
                    >
                      {index + 1}
                    </span>
                  ) : (
                    <span className="w-5 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                  )}
                  <Avatar size="sm">
                    <AvatarFallback className={avatarTone(customer.customerName)}>
                      {initials(customer.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{customer.customerName}</span>
                    <span className="text-xs text-muted-foreground">
                      {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatCurrency(customer.totalSpent)}
                  </span>
                </div>
                <div className="ml-8 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${(customer.totalSpent / maxSpent) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
