import { UsersIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CommissionSummaryRow } from "@/lib/commission"
import { formatCurrency } from "@/lib/utils"

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
    <Card>
      <CardHeader>
        <CardTitle>Commission by staff member</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load commission data</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : rows.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No commission activity</EmptyTitle>
            <EmptyDescription>No eligible layout orders in this period yet.</EmptyDescription>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Awaiting Payment</TableHead>
                <TableHead className="text-right">Total Commission</TableHead>
                <TableHead className="text-right">Orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.layoutBy}>
                  <TableCell className="font-medium">{row.layoutByName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <div>{formatCurrency(row.paidCommission)}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {row.releasedOrderCount} released · {row.pendingReleaseOrderCount} pending
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.unpaidCommission)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(row.totalCommission)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
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
