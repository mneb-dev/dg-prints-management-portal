import { ArrowUpRightIcon, CheckIcon, PartyPopperIcon, TrophyIcon } from "lucide-react"

import { Money } from "@/components/money"
import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { MonthlyIncentiveTier } from "@/lib/commission"
import { useSalesVisibility } from "@/lib/sales-visibility"
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
  const { isVisible } = useSalesVisibility()
  // Sales figures follow the app-wide "hide amounts" toggle; incentive amounts stay visible.
  const sales = (amount: number) => <Money amount={amount} hidden={!isVisible} />

  // The "active" tier is the highest met one once every tier is cleared, otherwise the first
  // unmet one -- only this segment/label gets the accent treatment so the bar reads as a single
  // journey, not 9 competing bars.
  const nextTierIndex = tiers.findIndex((tier) => !tier.isMet)
  const activeIndex = nextTierIndex === -1 ? tiers.length - 1 : nextTierIndex
  const activeTier = tiers[activeIndex]

  return (
    <Card>
      <CardHeader>
        <OrderFormSectionHeader
          icon={TrophyIcon}
          title="Incentive tiers"
          description={`${periodLabel} · in progress, releasable after the month ends`}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-64 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
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
            <dl className="flex flex-wrap items-stretch gap-x-8 gap-y-3">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Current incentive</dt>
                <dd className="text-3xl leading-none font-semibold tabular-nums">{formatCurrency(pool)}</dd>
              </div>
              {!isStaffView ? (
                <div className="flex flex-col gap-1 border-l pl-8">
                  <dt className="text-xs text-muted-foreground">Team sales this month</dt>
                  <dd className="text-3xl leading-none font-semibold tabular-nums">{sales(totalStaffSales)}</dd>
                </div>
              ) : null}
            </dl>

            {tiers.length > 0 ? (
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
                        className="h-2.5 flex-1 overflow-hidden bg-muted first:rounded-l-full last:rounded-r-full"
                      >
                        <div
                          className={cn(
                            "h-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
                            tier.isMet ? "bg-order-status-teal" : "bg-primary"
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
                        index === activeIndex && !tier.isMet ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span className="flex items-center gap-0.5 text-[10px] tabular-nums sm:text-xs">
                        {tier.isMet ? <CheckIcon aria-hidden className="size-3 stroke-3 text-order-status-teal" /> : null}
                        {formatCompactCurrency(tier.threshold)}
                      </span>
                      <span className="text-[10px] tabular-nums opacity-80">{formatCurrency(tier.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!isStaffView && activeTier ? (
              activeTier.isMet ? (
                <p className="flex items-center gap-2 rounded-lg bg-order-status-teal/10 px-3 py-2 text-sm font-medium">
                  <PartyPopperIcon aria-hidden className="size-4 shrink-0 text-order-status-teal" />
                  Top incentive tier reached this month.
                </p>
              ) : (
                <p className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2 text-sm text-muted-foreground">
                  <ArrowUpRightIcon aria-hidden className="size-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {sales(Math.max(activeTier.threshold - totalStaffSales, 0))}
                    </span>{" "}
                    more in team sales unlocks a{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(activeTier.amount)}
                    </span>{" "}
                    incentive.
                  </span>
                </p>
              )
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
