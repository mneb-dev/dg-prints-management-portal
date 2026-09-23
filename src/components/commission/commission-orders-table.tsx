import { useState, type ReactNode } from "react"
import { HandCoinsIcon, MoreHorizontalIcon, Undo2Icon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import {
  CommissionReleaseBadge,
  getCommissionReleaseStatus,
} from "@/components/commission/commission-release-badge"
import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge"
import { TABLE_HEAD_CLASS, TABLE_HEADER_CLASS } from "@/components/table-surface"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CommissionOrderRow } from "@/lib/commission"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

export function CommissionOrdersTable({
  rows,
  total,
  pendingReleaseIds,
  footer,
  isLoading,
  isError,
  isStaffView,
  showStaffColumn,
  onRelease,
  onUnrelease,
  isMutating,
}: {
  rows: CommissionOrderRow[]
  /** Rows matching the release filter across every page. */
  total: number
  /** Every pending-release order in the period, across pages — what "Release all pending" acts on. */
  pendingReleaseIds: string[]
  /** Rendered below the rows (the pager). */
  footer?: ReactNode
  isLoading: boolean
  isError: boolean
  isStaffView: boolean
  showStaffColumn: boolean
  onRelease: (orderIds: string[]) => void
  onUnrelease: (orderIds: string[]) => void
  isMutating: boolean
}) {
  const [confirmingBulkRelease, setConfirmingBulkRelease] = useState(false)
  const [undoTarget, setUndoTarget] = useState<CommissionOrderRow | null>(null)

  const hasPending = pendingReleaseIds.length > 0

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <OrderFormSectionHeader
          icon={HandCoinsIcon}
          title="Layout orders"
          description={
            isLoading
              ? "Orders with layout work in this period"
              : `${total.toLocaleString()} ${total === 1 ? "order" : "orders"} in this period`
          }
        />
        {!isStaffView ? (
          <CardAction>
            <Button
              type="button"
              variant={hasPending ? "default" : "outline"}
              size="sm"
              disabled={!hasPending || isMutating}
              onClick={() => setConfirmingBulkRelease(true)}
            >
              <HandCoinsIcon data-icon="inline-start" />
              Release all pending
              <span className="tabular-nums opacity-80">({pendingReleaseIds.length})</span>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="px-4 pb-4">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError ? (
          <div className="px-4 pb-4">
            <Empty className="border">
              <EmptyMedia variant="icon">
                <HandCoinsIcon />
              </EmptyMedia>
              <EmptyTitle>Couldn't load commission data</EmptyTitle>
              <EmptyDescription>Try refreshing the page.</EmptyDescription>
            </Empty>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 pb-4">
            <Empty className="border">
              <EmptyMedia variant="icon">
                <HandCoinsIcon />
              </EmptyMedia>
              <EmptyTitle>No commission activity</EmptyTitle>
              <EmptyDescription>No eligible layout orders in this period yet.</EmptyDescription>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableHeader className={TABLE_HEADER_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TABLE_HEAD_CLASS}>Order</TableHead>
                {showStaffColumn ? <TableHead className={TABLE_HEAD_CLASS}>Staff</TableHead> : null}
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Layout fee</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Commission</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Created</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Payment</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Release</TableHead>
                {!isStaffView ? (
                  <TableHead className={cn(TABLE_HEAD_CLASS, "w-0 text-right")}>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const releaseStatus = getCommissionReleaseStatus(row.paymentStatus, row.releasedAt)
                return (
                  <TableRow key={row.id} className="hover:bg-transparent">
                    <TableCell className="px-4">
                      <div className="font-medium">{row.orderNumber}</div>
                      <div className="max-w-48 truncate text-xs text-muted-foreground">{row.customerName}</div>
                    </TableCell>
                    {showStaffColumn ? <TableCell className="px-4">{row.layoutByName}</TableCell> : null}
                    <TableCell className="px-4 text-right text-muted-foreground tabular-nums">
                      {formatCurrency(row.layoutFee)}
                    </TableCell>
                    <TableCell className="px-4 text-right font-semibold tabular-nums">
                      {formatCurrency(row.commissionAmount)}
                    </TableCell>
                    <TableCell className="px-4 whitespace-nowrap text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="px-4">
                      <PaymentStatusBadge status={row.paymentStatus} />
                    </TableCell>
                    <TableCell className="px-4">
                      <CommissionReleaseBadge status={releaseStatus} />
                    </TableCell>
                    {!isStaffView ? (
                      <TableCell className="px-4">
                        <div className="flex justify-end">
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
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`More actions for ${row.orderNumber}`}
                                    disabled={isMutating}
                                    className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                                  />
                                }
                              >
                                <MoreHorizontalIcon />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-44">
                                <DropdownMenuItem variant="destructive" onClick={() => setUndoTarget(row)}>
                                  <Undo2Icon />
                                  <span className="leading-none">Undo release</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {!isLoading && !isError && rows.length > 0 ? footer : null}
      </CardContent>

      <ConfirmDialog
        open={confirmingBulkRelease}
        onOpenChange={setConfirmingBulkRelease}
        tone="primary"
        icon={HandCoinsIcon}
        title={`Release ${pendingReleaseIds.length} pending ${pendingReleaseIds.length === 1 ? "commission" : "commissions"}?`}
        description={`Marks ${pendingReleaseIds.length === 1 ? "the order" : `these ${pendingReleaseIds.length} orders`} as paid out to staff and locks in today's commission rate.`}
        confirmLabel="Yes, release"
        pendingLabel="Releasing…"
        cancelLabel="No, not yet"
        isPending={isMutating}
        onConfirm={() => {
          onRelease(pendingReleaseIds)
          setConfirmingBulkRelease(false)
        }}
      />

      <ConfirmDialog
        open={undoTarget !== null}
        onOpenChange={(open) => !open && setUndoTarget(null)}
        tone="danger"
        icon={Undo2Icon}
        title={
          <>
            Undo the release for <Name>{undoTarget?.orderNumber ?? ""}</Name>?
          </>
        }
        description="The commission goes back to pending release, and its amount is taken back out of the payroll expense it was released in."
        confirmLabel="Yes, undo it"
        pendingLabel="Undoing…"
        cancelLabel="No, keep it"
        isPending={isMutating}
        onConfirm={() => {
          if (undoTarget) onUnrelease([undoTarget.id])
          setUndoTarget(null)
        }}
      />
    </Card>
  )
}
