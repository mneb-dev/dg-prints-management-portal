import { UsersIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { useCustomerRankings } from "@/lib/orders"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? "").concat(parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "").toUpperCase()
}

export function TopCustomersCard() {
  const { customerNames, customerDetailsByName, isLoading } = useCustomerRankings()
  const topCustomers = customerNames
    .slice(0, 6)
    .map((name) => customerDetailsByName.get(name))
    .filter((customer) => customer !== undefined)

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
          <ul className="flex flex-col gap-2">
            {topCustomers.map((customer) => (
              <li key={customer.customerName} className="flex items-center gap-3 text-sm">
                <Avatar size="sm">
                  <AvatarFallback>{initials(customer.customerName)}</AvatarFallback>
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
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
