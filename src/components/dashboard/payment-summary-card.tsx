import { ArrowRightIcon, WalletIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import { IconBadge } from "@/components/icon-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { useOrderActions, useOrderStats } from "@/lib/orders"
import type { PaymentStatus } from "@/lib/orders"

const FOLLOW_UP_STATUSES = ["unpaid", "partially_paid"] as const satisfies readonly PaymentStatus[]

export function PaymentSummaryCard() {
  const { stats, isLoading } = useOrderStats()
  const { setOrdersFilter } = useOrderActions()
  const navigate = useNavigate()

  const outstandingBalance = stats?.outstandingBalance ?? 0
  const needsFollowUp = outstandingBalance > 0

  function viewOrders(paymentStatus: PaymentStatus) {
    setOrdersFilter({ paymentStatus, page: 1 })
    navigate("/orders")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconBadge
            icon={WalletIcon}
            size="sm"
            className={cn(
              needsFollowUp && "bg-brand-gradient text-primary-foreground shadow-[var(--shadow-button)]"
            )}
          />
          <CardTitle>Payments needing follow-up</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <Skeleton className="h-22 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-11 rounded-lg" />
              <Skeleton className="h-11 rounded-lg" />
            </div>
          </>
        ) : (
          <>
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border-l-4 p-4 transition-colors",
                needsFollowUp ? "border-primary bg-accent" : "border-transparent bg-muted"
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Outstanding balance</span>
                <span
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    needsFollowUp ? "text-primary" : "text-foreground"
                  )}
                >
                  {formatCurrency(outstandingBalance)}
                </span>
              </div>
              {needsFollowUp && (
                <span className="relative flex size-2.5 shrink-0" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FOLLOW_UP_STATUSES.map((status) => {
                const count = stats?.byPaymentStatus[status] ?? 0
                const isClear = count === 0
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => viewOrders(status)}
                    disabled={isClear}
                    aria-label={`${count} ${status === "unpaid" ? "unpaid" : "partially paid"} ${count === 1 ? "order" : "orders"} — view orders`}
                    className={cn(
                      // Same clickable-tile recipe as the dashboard stat tiles: neutral chrome,
                      // brand-tinted border + wash on hover, press scale, focus ring.
                      "group/tile flex cursor-pointer items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-left outline-none",
                      "transition-[scale,border-color,background-color] duration-200 ease-out",
                      "hover:border-primary/40 hover:bg-accent/60 active:scale-[0.98] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      "motion-reduce:active:scale-100",
                      "disabled:cursor-default disabled:bg-muted/40 disabled:hover:border-border"
                    )}
                  >
                    <PaymentStatusBadge status={status} />
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-lg leading-none font-semibold tabular-nums",
                          isClear && "text-muted-foreground"
                        )}
                      >
                        {count.toLocaleString()}
                      </span>
                      {!isClear && (
                        <ArrowRightIcon
                          aria-hidden
                          className="size-4 shrink-0 text-muted-foreground transition-[translate,color] duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:text-primary motion-reduce:group-hover/tile:translate-x-0"
                        />
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
