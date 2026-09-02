import { useNavigate } from "react-router-dom"

import { PAYMENT_STATUS_LABELS } from "@/components/orders/payment-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
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
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">Outstanding balance</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(outstandingBalance)}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={viewUnpaid} disabled={unpaidCount === 0}>
              View unpaid orders
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
