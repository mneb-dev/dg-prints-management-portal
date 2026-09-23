import { useMemo, useState } from "react"
import { endOfMonth, format, parseISO } from "date-fns"
import { HandCoinsIcon, HistoryIcon, MoreHorizontalIcon, Undo2Icon } from "lucide-react"
import { toast } from "sonner"

import { Money } from "@/components/money"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DotBadge } from "@/components/dot-badge"
import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useMonthlyIncentiveHistory, useMonthlyIncentiveReleaseActions } from "@/lib/commission"
import { useSalesVisibility } from "@/lib/sales-visibility"
import { cn, formatCurrency } from "@/lib/utils"

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), "MMMM"))
const MONTH_FILTER_OPTIONS = [{ value: "all", label: "All months" }, ...MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }))]
const YEAR_LOOKBACK = 4

type ConfirmTarget = { periodMonth: string; action: "release" | "unrelease" }

export function IncentiveHistoryTable() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [monthFilter, setMonthFilter] = useState("all")
  const [isMutating, setIsMutating] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)

  const { rows, isLoading, isError, refetch } = useMonthlyIncentiveHistory(year)
  const { isVisible } = useSalesVisibility()
  const { release, unrelease } = useMonthlyIncentiveReleaseActions()

  const yearOptions = useMemo(
    () => Array.from({ length: YEAR_LOOKBACK + 1 }, (_, i) => currentYear - i),
    [currentYear]
  )

  const filteredRows = useMemo(() => {
    if (monthFilter === "all") return rows
    return rows.filter((row) => String(parseISO(row.periodMonth).getMonth() + 1) === monthFilter)
  }, [rows, monthFilter])

  // Newest month first -- the history RPC returns Jan-first, which reads backwards for "what do I
  // need to release" (the most recently completed month is usually what an admin is here to act on).
  const sortedRows = useMemo(() => [...filteredRows].reverse(), [filteredRows])

  async function handleConfirm() {
    if (!confirmTarget) return
    setIsMutating(true)
    try {
      const monthStart = parseISO(confirmTarget.periodMonth)
      const dateFrom = format(monthStart, "yyyy-MM-dd")
      const dateTo = format(endOfMonth(monthStart), "yyyy-MM-dd")
      if (confirmTarget.action === "release") {
        await release(dateFrom, dateTo)
        toast.success("Monthly incentive released.")
      } else {
        await unrelease(dateFrom, dateTo)
        toast.success("Monthly incentive release undone.")
      }
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update the release.")
    } finally {
      setIsMutating(false)
      setConfirmTarget(null)
    }
  }

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <OrderFormSectionHeader
          icon={HistoryIcon}
          title="Incentive releases"
          description="Release each past month's pool to staff"
        />
        <CardAction className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(value) => value && setYear(Number(value))}>
            <SelectTrigger size="sm" aria-label="Year" className="w-24 text-xs">
              <SelectValue>{(value: string | null) => value ?? String(year)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={(value) => value && setMonthFilter(value)}>
            <SelectTrigger size="sm" aria-label="Month" className="w-32 text-xs">
              <SelectValue>
                {(value: string | null) =>
                  MONTH_FILTER_OPTIONS.find((option) => option.value === (value ?? monthFilter))?.label ??
                  "All months"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONTH_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
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
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>Couldn't load the release history</EmptyTitle>
              <EmptyDescription>Try refreshing the page.</EmptyDescription>
            </Empty>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="px-4 pb-4">
            <Empty className="border">
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>No months to show</EmptyTitle>
              <EmptyDescription>Try a different year or month filter.</EmptyDescription>
            </Empty>
          </div>
        ) : (
          <Table>
            <TableHeader className={TABLE_HEADER_CLASS}>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TABLE_HEAD_CLASS}>Month</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Staff sales</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "text-right")}>Pool</TableHead>
                <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
                <TableHead className={cn(TABLE_HEAD_CLASS, "w-0 text-right")}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => {
                const monthLabel = format(parseISO(row.periodMonth), "MMMM yyyy")
                return (
                  <TableRow key={row.periodMonth} className="hover:bg-transparent">
                    <TableCell className="px-4 font-medium">{monthLabel}</TableCell>
                    <TableCell className="px-4 text-right tabular-nums">
                      <Money amount={row.totalStaffSales} hidden={!isVisible} />
                    </TableCell>
                    <TableCell className="px-4 text-right font-semibold tabular-nums">
                      {formatCurrency(row.pool)}
                    </TableCell>
                    <TableCell className="px-4">
                      {row.isCurrentMonth ? (
                        <DotBadge dotClassName="bg-order-status-violet">In progress</DotBadge>
                      ) : row.releasedAt ? (
                        <DotBadge dotClassName="bg-order-status-teal">Released</DotBadge>
                      ) : (
                        <DotBadge dotClassName="bg-order-status-gold">Not released</DotBadge>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex justify-end">
                        {row.isCurrentMonth ? (
                          <span className="text-xs whitespace-nowrap text-muted-foreground">After month ends</span>
                        ) : row.releasedAt ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`More actions for ${monthLabel}`}
                                  disabled={isMutating}
                                  className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                                />
                              }
                            >
                              <MoreHorizontalIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setConfirmTarget({ periodMonth: row.periodMonth, action: "unrelease" })}
                              >
                                <Undo2Icon />
                                <span className="leading-none">Undo release</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : row.pool <= 0 ? (
                          <Tooltip>
                            <TooltipTrigger render={<span tabIndex={0} />}>
                              <Button type="button" variant="outline" size="sm" disabled>
                                Release
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>No incentive to release — no tier was reached.</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => setConfirmTarget({ periodMonth: row.periodMonth, action: "release" })}
                          >
                            <HandCoinsIcon data-icon="inline-start" />
                            Release
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        tone={confirmTarget?.action === "release" ? "primary" : "danger"}
        icon={HandCoinsIcon}
        title={
          confirmTarget?.action === "release"
            ? `Release ${confirmTarget ? format(parseISO(confirmTarget.periodMonth), "MMMM yyyy") : ""}'s incentive?`
            : "Undo this release?"
        }
        description={
          confirmTarget?.action === "release"
            ? "Locks in the pool and creates one payroll expense per staff member for their share."
            : "Deletes the payroll expenses this release created, so the incentive is computed live again."
        }
        confirmLabel={confirmTarget?.action === "release" ? "Yes, release" : "Yes, undo it"}
        pendingLabel={confirmTarget?.action === "release" ? "Releasing…" : "Undoing…"}
        cancelLabel={confirmTarget?.action === "release" ? "No, not yet" : "No, keep it"}
        isPending={isMutating}
        onConfirm={handleConfirm}
      />
    </Card>
  )
}
