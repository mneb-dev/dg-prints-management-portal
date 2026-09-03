import { WalletIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { PAYMENT_STATUS_LABELS } from "@/components/orders/payment-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatCurrency } from "@/lib/utils"
import { useOrderActions, useOrderStats } from "@/lib/orders"

export function PaymentSummaryCard() {
  const { stats, isLoading } = useOrderStats()
  const { setOrdersFilter } = useOrderActions()
  const navigate = useNavigate()

  const unpaidCount = stats?.byPaymentStatus["unpaid"] ?? 0
  const partiallyPaidCount = stats?.byPaymentStatus["partially_paid"] ?? 0
  const outstandingBalance = stats?.outstandingBalance ?? 0

  function viewUnpaid() {
    setOrdersFilter({ paymentStatus: "unpaid", page: 1 })
    navigate("/orders")
  }

  function viewPartiallyPaid() {
    setOrdersFilter({ paymentStatus: "partially_paid", page: 1 })
    navigate("/orders")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments needing follow-up</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : (
          <>
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg p-4",
                outstandingBalance > 0 ? "bg-status-warning/10" : "bg-muted"
              )}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Outstanding balance</span>
                <span
                  className={cn(
                    "text-3xl font-semibold tabular-nums",
                    outstandingBalance > 0 ? "text-status-warning" : "text-foreground"
                  )}
                >
                  {formatCurrency(outstandingBalance)}
                </span>
              </div>
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  outstandingBalance > 0
                    ? "bg-status-warning/15 text-status-warning"
                    : "bg-background text-muted-foreground"
                )}
              >
                <WalletIcon className="size-5" />
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{PAYMENT_STATUS_LABELS.unpaid}</Badge>
                  <span className="text-sm text-muted-foreground">orders</span>
                </div>
                <span className="text-lg font-semibold tabular-nums">{unpaidCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{PAYMENT_STATUS_LABELS.partially_paid}</Badge>
                  <span className="text-sm text-muted-foreground">orders</span>
                </div>
                <span className="text-lg font-semibold tabular-nums">{partiallyPaidCount}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={viewUnpaid} disabled={unpaidCount === 0}>
                View unpaid orders
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={viewPartiallyPaid}
                disabled={partiallyPaidCount === 0}
              >
                View partially paid orders
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
