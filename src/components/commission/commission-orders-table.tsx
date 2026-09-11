import { useState } from "react"
import { HandCoinsIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  CommissionReleaseBadge,
  getCommissionReleaseStatus,
} from "@/components/commission/commission-release-badge"
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import type { CommissionOrderRow } from "@/lib/commission"
import { formatCurrency, formatDate } from "@/lib/utils"

export function CommissionOrdersTable({
  rows,
  isLoading,
  isError,
  isStaffView,
  showStaffColumn,
  onRelease,
  onUnrelease,
  isMutating,
}: {
  rows: CommissionOrderRow[]
  isLoading: boolean
  isError: boolean
  isStaffView: boolean
  showStaffColumn: boolean
  onRelease: (orderIds: string[]) => void
  onUnrelease: (orderIds: string[]) => void
  isMutating: boolean
}) {
  const [confirmingBulkRelease, setConfirmingBulkRelease] = useState(false)

  const pendingReleaseIds = rows
    .filter((row) => getCommissionReleaseStatus(row.paymentStatus, row.releasedAt) === "pending_release")
    .map((row) => row.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Layout orders</CardTitle>
        {!isStaffView ? (
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingReleaseIds.length === 0 || isMutating}
              onClick={() => setConfirmingBulkRelease(true)}
            >
              Release all pending ({pendingReleaseIds.length})
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <HandCoinsIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load commission data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : rows.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <HandCoinsIcon />
            </EmptyMedia>
            <EmptyTitle>No commission activity</EmptyTitle>
            <EmptyDescription>No eligible layout orders in this period yet.</EmptyDescription>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                {showStaffColumn ? <TableHead>Staff</TableHead> : null}
                <TableHead className="text-right">Layout Fee</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Release</TableHead>
                {!isStaffView ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const releaseStatus = getCommissionReleaseStatus(row.paymentStatus, row.releasedAt)
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.orderNumber}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    {showStaffColumn ? <TableCell>{row.layoutByName}</TableCell> : null}
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.layoutFee)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(row.commissionAmount)}
                    </TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={row.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <CommissionReleaseBadge status={releaseStatus} />
                    </TableCell>
                    {!isStaffView ? (
                      <TableCell className="text-right">
                        {releaseStatus === "pending_release" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => onRelease([row.id])}
                          >
                            Release
                          </Button>
                        ) : releaseStatus === "released" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => onUnrelease([row.id])}
                          >
                            Undo Release
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={confirmingBulkRelease} onOpenChange={setConfirmingBulkRelease}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-status-success/10 text-status-success">
              <HandCoinsIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Release {pendingReleaseIds.length} pending commissions?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks {pendingReleaseIds.length} order{pendingReleaseIds.length === 1 ? "" : "s"} as paid out
              to staff and locks in the commission amount at today's rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={() => {
                onRelease(pendingReleaseIds)
                setConfirmingBulkRelease(false)
              }}
            >
              {isMutating && <Spinner data-icon="inline-start" />}
              Release
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
