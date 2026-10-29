import { StatCard } from "@/components/dashboard/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"

function orders(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "order" : "orders"}`
}

/** Commission buckets, with the same names and dot colors as the release filter and each order's
 * status badge. Staff see only the two that still need something to happen; admins also get the
 * total and what's already been released (`showTotals`). */
export function CommissionSummaryCards({
  showTotals,
  totalCommission,
  totalOrderCount,
  unpaidCommission,
  unpaidOrderCount,
  pendingReleaseCommission,
  pendingReleaseOrderCount,
  releasedCommission,
  releasedOrderCount,
  isLoading,
}: {
  showTotals: boolean
  totalCommission: number
  totalOrderCount: number
  unpaidCommission: number
  unpaidOrderCount: number
  pendingReleaseCommission: number
  pendingReleaseOrderCount: number
  releasedCommission: number
  releasedOrderCount: number
  isLoading: boolean
}) {
  const gridClassName = cn("grid grid-cols-2 gap-3", showTotals && "lg:grid-cols-4")

  if (isLoading) {
    return (
      <div className={gridClassName}>
        {Array.from({ length: showTotals ? 4 : 2 }).map((_, index) => (
          <Skeleton key={index} className="h-[88px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className={gridClassName}>
      {showTotals ? (
        <StatCard
          label="Total commission"
          value={formatCurrency(totalCommission)}
          description={orders(totalOrderCount)}
          dotClassName="bg-primary"
        />
      ) : null}
      <StatCard
        label="Awaiting payment"
        value={formatCurrency(unpaidCommission)}
        description={orders(unpaidOrderCount)}
        dotClassName="bg-muted-foreground/40"
      />
      <StatCard
        label="Pending release"
        value={formatCurrency(pendingReleaseCommission)}
        description={orders(pendingReleaseOrderCount)}
        dotClassName="bg-order-status-gold"
      />
      {showTotals ? (
        <StatCard
          label="Released"
          value={formatCurrency(releasedCommission)}
          description={orders(releasedOrderCount)}
          dotClassName="bg-order-status-teal"
        />
      ) : null}
    </div>
  )
}
