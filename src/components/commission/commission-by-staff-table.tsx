import { UsersIcon } from "lucide-react"

import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { TABLE_HEAD_CLASS, TABLE_HEADER_CLASS } from "@/components/table-surface"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CommissionSummaryRow } from "@/lib/commission"
import { cn, formatCurrency } from "@/lib/utils"

export function CommissionByStaffTable({
  rows,
  isLoading,
  isError,
}: {
  rows: CommissionSummaryRow[]
  isLoading: boolean
  isError: boolean
}) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <OrderFormSectionHeader
          icon={UsersIcon}
          title="Commission by staff"
          description="Collected vs. still awaiting customer payment"
        />
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="px-4 pb-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <div className="px-4 pb-4">
            <Empty className="border">
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>Couldn't load commission data</EmptyTitle>
              <EmptyDescription>Try refreshing the page.</EmptyDescription>
            </Empty>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 pb-4">
            <Empty className="border">
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No commission activity</EmptyTitle>
              <EmptyDescription>No eligible layout orders in this period yet.</EmptyDescription>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableHeader className={TABLE_HEADER_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TABLE_HEAD_CLASS}>Staff</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Collected</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Awaiting payment</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Total commission</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.layoutBy} className="hover:bg-transparent">
                  <TableCell className="px-4 font-medium">{row.layoutByName}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">
                    <div>{formatCurrency(row.paidCommission)}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {row.releasedOrderCount} released · {row.pendingReleaseOrderCount} pending
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatCurrency(row.unpaidCommission)}</TableCell>
                  <TableCell className="px-4 text-right font-semibold tabular-nums">
                    {formatCurrency(row.totalCommission)}
                  </TableCell>
                  <TableCell className="px-4 text-right text-muted-foreground tabular-nums">
                    {row.totalOrderCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
