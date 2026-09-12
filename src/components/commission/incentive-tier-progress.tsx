import { TrendingUpIcon, TrophyIcon } from "lucide-react"

import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { MonthlyIncentiveTier } from "@/lib/commission"
import { cn, formatCurrency } from "@/lib/utils"

function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function IncentiveTierProgress({
  periodLabel,
  totalStaffSales,
  pool,
  tiers,
  isLoading,
  isError,
  isStaffView,
}: {
  periodLabel: string
  totalStaffSales: number
  pool: number
  tiers: MonthlyIncentiveTier[]
  isLoading: boolean
  isError: boolean
  /** Staff see the tier ladder and their own current incentive, but not the team's aggregate
   * sales total or how far away the next tier is -- those stay admin/superadmin-only. */
  isStaffView: boolean
}) {
  // The "active" tier is the highest met one once every tier is cleared, otherwise the first
  // unmet one -- only this segment/label gets the accent treatment so the bar reads as a single
  // journey, not 9 competing bars.
  const nextTierIndex = tiers.findIndex((tier) => !tier.isMet)
  const activeIndex = nextTierIndex === -1 ? tiers.length - 1 : nextTierIndex
  const activeTier = tiers[activeIndex]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incentive tiers</CardTitle>
        <CardDescription>{periodLabel} team sales — still in progress, not yet releasable</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Skeleton className="h-[88px] w-full rounded-xl" />
              <Skeleton className="h-[88px] w-full rounded-xl" />
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
          </>
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <TrophyIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load monthly incentives</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : (
          <>
            <div className={cn("grid grid-cols-1 gap-3", !isStaffView && "sm:grid-cols-2")}>
              {!isStaffView ? (
                <StatCard
                  icon={TrendingUpIcon}
                  label="Team Sales This Month"
                  value={formatCurrency(totalStaffSales)}
                />
              ) : null}
              <StatCard
                icon={TrophyIcon}
                label="Current Incentive"
                value={formatCurrency(pool)}
                iconClassName="bg-status-success/10 text-status-success"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {tiers.map((tier, index) => {
                  const lowerBound = index === 0 ? 0 : tiers[index - 1].threshold
                  const fillPercent = Math.min(
                    Math.max(((totalStaffSales - lowerBound) / (tier.threshold - lowerBound)) * 100, 0),
                    100
                  )
                  return (
                    <div
                      key={tier.threshold}
                      className="h-3 flex-1 overflow-hidden bg-muted first:rounded-l-full last:rounded-r-full"
                    >
                      <div
                        className={cn(
                          "h-full transition-all duration-200",
                          tier.isMet ? "bg-status-success" : "bg-primary"
                        )}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-1">
                {tiers.map((tier, index) => (
                  <div
                    key={tier.threshold}
                    className={cn(
                      "flex flex-1 flex-col items-center text-center",
                      tier.isMet ? "text-status-success" : index === activeIndex ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <span className="text-[10px] font-medium tabular-nums sm:text-xs">
                      {formatCompactCurrency(tier.threshold)}
                    </span>
                    <span className="text-[10px] tabular-nums opacity-80">{formatCurrency(tier.amount)}</span>
                  </div>
                ))}
              </div>

              {!isStaffView ? (
                <p className="text-sm text-muted-foreground">
                  {activeTier.isMet ? (
                    "Top incentive tier reached this month."
                  ) : (
                    <>
                      <span className="font-medium text-foreground">
                        {formatCurrency(Math.max(activeTier.threshold - totalStaffSales, 0))}
                      </span>{" "}
                      more in staff sales unlocks a{" "}
                      <span className="font-medium text-foreground">{formatCurrency(activeTier.amount)}</span>{" "}
                      incentive.
                    </>
                  )}
                </p>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
