import { CheckCircle2Icon, CircleDollarSignIcon, WalletIcon } from "lucide-react"

import { StatCard } from "@/components/dashboard/stat-card"
import { RecapStrip } from "@/components/recap-strip"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

function orders(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "order" : "orders"}`
}

/** A labelled figure with a status dot and an order count underneath — one RecapStrip cell. */
function DotValue({ dotClassName, amount, count }: { dotClassName: string; amount: number; count: number }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${dotClassName}`} />
        {formatCurrency(amount)}
      </span>
      <span className="text-xs font-normal text-muted-foreground">{orders(count)}</span>
    </span>
  )
}

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
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={WalletIcon}
          label="Total commission"
          value={formatCurrency(totalCommission)}
          description={`${orders(totalOrderCount)} with layout work`}
        />
        <StatCard
          icon={CircleDollarSignIcon}
          label="Awaiting customer payment"
          value={formatCurrency(unpaidCommission)}
          description={`${orders(unpaidOrderCount)} not fully paid yet`}
        />
        <StatCard
          icon={CheckCircle2Icon}
          label="Collected"
          value={formatCurrency(paidCommission)}
          description={`${orders(paidOrderCount)} fully paid`}
        />
      </div>

      {/* Where the collected commission stands: already paid out to staff, or waiting on release. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">
          Of the <span className="font-medium text-foreground tabular-nums">{formatCurrency(paidCommission)}</span>{" "}
          collected
        </span>
        <RecapStrip
          items={[
            {
              label: "Released to staff",
              value: (
                <DotValue dotClassName="bg-order-status-teal" amount={releasedCommission} count={releasedOrderCount} />
              ),
            },
            {
              label: "Pending release",
              emphasis: pendingReleaseCommission > 0,
              value: (
                <DotValue
                  dotClassName="bg-order-status-gold"
                  amount={pendingReleaseCommission}
                  count={pendingReleaseOrderCount}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
