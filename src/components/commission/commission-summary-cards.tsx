import { CheckCircle2Icon, CircleDollarSignIcon, ClockIcon, HandCoinsIcon, WalletIcon } from "lucide-react"

import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

export function CommissionSummaryCards({
  totalCommission,
  totalOrderCount,
  unpaidCommission,
  unpaidOrderCount,
  paidCommission,
  paidOrderCount,
  releasedCommission,
  releasedOrderCount,
  pendingReleaseCommission,
  pendingReleaseOrderCount,
  isLoading,
}: {
  totalCommission: number
  totalOrderCount: number
  unpaidCommission: number
  unpaidOrderCount: number
  paidCommission: number
  paidOrderCount: number
  releasedCommission: number
  releasedOrderCount: number
  pendingReleaseCommission: number
  pendingReleaseOrderCount: number
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[88px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={WalletIcon}
          label="Total Commission"
          value={formatCurrency(totalCommission)}
          description={`${totalOrderCount} layout orders`}
        />
        <StatCard
          icon={CircleDollarSignIcon}
          label="Awaiting Customer Payment"
          value={formatCurrency(unpaidCommission)}
          description={`${unpaidOrderCount} unpaid orders`}
          iconClassName="bg-status-warning/10 text-status-warning"
        />
        <StatCard
          icon={CheckCircle2Icon}
          label="Collected"
          value={formatCurrency(paidCommission)}
          description={`${paidOrderCount} paid orders`}
          iconClassName="bg-status-success/10 text-status-success"
        />
      </div>

      <Card size="sm" className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Release status <span className="font-normal">— of the {formatCurrency(paidCommission)} collected</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-success/10 text-status-success">
              <HandCoinsIcon className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-semibold tabular-nums">{formatCurrency(releasedCommission)}</span>
              <span className="truncate text-xs text-muted-foreground">
                Released to staff · {releasedOrderCount} orders
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
              <ClockIcon className="size-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-semibold tabular-nums">{formatCurrency(pendingReleaseCommission)}</span>
              <span className="truncate text-xs text-muted-foreground">
                Pending release · {pendingReleaseOrderCount} orders
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
