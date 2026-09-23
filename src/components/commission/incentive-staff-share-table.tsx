import { UsersIcon } from "lucide-react"

import { Money } from "@/components/money"
import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { TABLE_HEAD_CLASS, TABLE_HEADER_CLASS } from "@/components/table-surface"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MonthlyIncentiveStaffShare } from "@/lib/commission"
import { useSalesVisibility } from "@/lib/sales-visibility"
import { cn, formatCurrency } from "@/lib/utils"

export function IncentiveStaffShareTable({
  rows,
  isLoading,
  isError,
}: {
  rows: MonthlyIncentiveStaffShare[]
  isLoading: boolean
  isError: boolean
}) {
  const { isVisible } = useSalesVisibility()
  const sales = (amount: number) => <Money amount={amount} hidden={!isVisible} />
  const totalSales = rows.reduce((sum, row) => sum + row.ownSales, 0)
  const totalIncentive = rows.reduce((sum, row) => sum + row.commissionShare, 0)

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <OrderFormSectionHeader
          icon={UsersIcon}
          title="Incentive split"
          description="Each person's share of this month's pool"
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
              <EmptyTitle>Couldn't load the incentive split</EmptyTitle>
              <EmptyDescription>Try refreshing the page.</EmptyDescription>
            </Empty>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 pb-4">
            <Empty className="border">
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No staff sales this month</EmptyTitle>
              <EmptyDescription>No eligible orders yet to split an incentive for.</EmptyDescription>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableHeader className={TABLE_HEADER_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TABLE_HEAD_CLASS}>Staff</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Own sales</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Share</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Incentive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId} className="hover:bg-transparent">
                  <TableCell className="px-4 font-medium">{row.name}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{sales(row.ownSales)}</TableCell>
                  <TableCell className="px-4 text-right text-muted-foreground tabular-nums">
                    {row.percentageShare.toFixed(1)}%
                  </TableCell>
                  <TableCell className="px-4 text-right font-semibold tabular-nums">
                    {formatCurrency(row.commissionShare)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableCell className="px-4 text-muted-foreground">Total</TableCell>
                <TableCell className="px-4 text-right tabular-nums">{sales(totalSales)}</TableCell>
                <TableCell className="px-4 text-right text-muted-foreground tabular-nums">100%</TableCell>
                <TableCell className="px-4 text-right font-semibold tabular-nums">
                  {formatCurrency(totalIncentive)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
