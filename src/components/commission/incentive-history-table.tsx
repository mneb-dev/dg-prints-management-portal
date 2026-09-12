import { useMemo, useState } from "react"
import { endOfMonth, format, parseISO } from "date-fns"
import { HandCoinsIcon, HistoryIcon } from "lucide-react"
import { toast } from "sonner"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMonthlyIncentiveHistory, useMonthlyIncentiveReleaseActions } from "@/lib/commission"
import { formatCurrency } from "@/lib/utils"

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
    <Card>
      <CardHeader>
        <CardTitle>Incentive releases</CardTitle>
        <CardDescription>Review past months and release each one's incentive pool to staff</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <Select value={String(year)} onValueChange={(value) => value && setYear(Number(value))}>
            <SelectTrigger size="sm" className="w-28 text-xs">
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
            <SelectTrigger size="sm" className="w-36 text-xs">
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
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : isError ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <HistoryIcon />
            </EmptyMedia>
            <EmptyTitle>Couldn't load the release history</EmptyTitle>
            <EmptyDescription>Try refreshing the page.</EmptyDescription>
          </Empty>
        ) : sortedRows.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <HistoryIcon />
            </EmptyMedia>
            <EmptyTitle>No months to show</EmptyTitle>
            <EmptyDescription>Try a different year or month filter.</EmptyDescription>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Staff Sales</TableHead>
                <TableHead className="text-right">Pool</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.periodMonth}>
                  <TableCell className="font-medium">{format(parseISO(row.periodMonth), "MMMM yyyy")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.totalStaffSales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.pool)}</TableCell>
                  <TableCell>
                    {row.isCurrentMonth ? (
                      <Badge variant="secondary">In progress</Badge>
                    ) : row.releasedAt ? (
                      <Badge className="bg-status-success/10 text-status-success">Released</Badge>
                    ) : (
                      <Badge variant="secondary">Not released</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.isCurrentMonth ? (
                      <span className="text-xs text-muted-foreground">Ends before it can be released</span>
                    ) : row.releasedAt ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => setConfirmTarget({ periodMonth: row.periodMonth, action: "unrelease" })}
                      >
                        Undo Release
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isMutating || row.pool <= 0}
                        onClick={() => setConfirmTarget({ periodMonth: row.periodMonth, action: "release" })}
                      >
                        Release
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                confirmTarget?.action === "release" ? "bg-status-success/10 text-status-success" : undefined
              }
            >
              <HandCoinsIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {confirmTarget?.action === "release"
                ? `Release ${confirmTarget ? format(parseISO(confirmTarget.periodMonth), "MMMM yyyy") : ""}'s incentive?`
                : "Undo this release?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.action === "release"
                ? "This locks in the pool and creates one payroll expense per staff member for their share."
                : "This deletes the payroll expenses this release created and lets the incentive be recomputed live."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isMutating} onClick={handleConfirm}>
              {isMutating && <Spinner data-icon="inline-start" />}
              {confirmTarget?.action === "release" ? "Release" : "Undo Release"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
