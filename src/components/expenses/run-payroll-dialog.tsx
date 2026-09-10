import { useEffect, useState } from "react"
import { addDays, eachDayOfInterval, format, isSameDay, min, startOfWeek } from "date-fns"
import { CalendarDaysIcon, HandCoinsIcon, UsersIcon } from "lucide-react"
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
import { Calendar } from "@/components/ui/calendar"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useExpenseActions } from "@/lib/expenses"
import { useStaffWithDailyRate } from "@/lib/users"
import { cn, formatCurrency } from "@/lib/utils"

/** Mon-Sat of the current week, clamped at today -- matches the calendar's own
 * `disabled={{ after: new Date() }}` so nothing pre-selected is actually unselectable. */
function defaultWorkedDates(): Date[] {
  const now = new Date()
  const monday = startOfWeek(now, { weekStartsOn: 1 })
  const saturday = addDays(monday, 5)
  return eachDayOfInterval({ start: monday, end: min([saturday, now]) })
}

/** Collapses selected dates into compact ranges for the expense notes -- consecutive days
 * become "Sep 7-12"; a gap (an absence in the middle) breaks into separate ranges instead of
 * papering over it, e.g. "Sep 7-9, 11-12" when Sep 10 wasn't selected. */
function formatDateRanges(dates: Date[]): string {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const ranges: { start: Date; end: Date }[] = []

  for (const date of sorted) {
    const current = ranges[ranges.length - 1]
    if (current && isSameDay(addDays(current.end, 1), date)) {
      current.end = date
    } else {
      ranges.push({ start: date, end: date })
    }
  }

  return ranges
    .map(({ start, end }) => {
      if (isSameDay(start, end)) return format(start, "MMM d")
      if (start.getMonth() === end.getMonth()) return `${format(start, "MMM d")}-${format(end, "d")}`
      return `${format(start, "MMM d")}-${format(end, "MMM d")}`
    })
    .join(", ")
}

export function RunPayrollDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}) {
  const { staff, isLoading: isStaffLoading } = useStaffWithDailyRate(open)
  const { addExpense } = useExpenseActions()

  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set())
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedStaffIds(new Set())
    setSelectedDates(defaultWorkedDates())
  }, [open])

  function toggleStaff(id: string) {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const includedStaff = staff.filter((person) => selectedStaffIds.has(person.id))
  const dayCount = selectedDates.length
  const totalAmount = includedStaff.reduce((sum, person) => sum + (person.dailyRate ?? 0) * dayCount, 0)
  const canSubmit = includedStaff.length > 0 && dayCount > 0

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const dateLabel = formatDateRanges(selectedDates)

      await Promise.all(
        includedStaff.map((person) =>
          addExpense({
            date: today,
            amount: (person.dailyRate ?? 0) * dayCount,
            category: "Payroll and Employee Costs",
            paymentMethod: "Cash",
            notes: `Payroll — ${person.firstName} ${person.lastName} (${dayCount} day${dayCount === 1 ? "" : "s"}: ${dateLabel})`,
          })
        )
      )
      toast.success(`Payroll recorded for ${includedStaff.length} staff member${includedStaff.length === 1 ? "" : "s"}.`)
      setConfirmOpen(false)
      onOpenChange(false)
      onCreated?.()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to record payroll.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Run Payroll</DialogTitle>
            <DialogDescription>
              Select staff and the days they reported to work — pay is calculated automatically as
              daily rate × days.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card size="sm" className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <UsersIcon className="size-4 text-muted-foreground" />
                    Staff
                  </CardTitle>
                  <CardAction>
                    <Badge variant="secondary">{selectedStaffIds.size} selected</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex-1">
                  {isStaffLoading ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-11 w-full" />
                      ))}
                    </div>
                  ) : staff.length === 0 ? (
                    <Empty>
                      <EmptyMedia variant="icon">
                        <UsersIcon />
                      </EmptyMedia>
                      <EmptyTitle>No daily rate configured</EmptyTitle>
                      <EmptyDescription>Set one in Edit User first.</EmptyDescription>
                    </Empty>
                  ) : (
                    <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
                      {staff.map((person) => {
                        const isSelected = selectedStaffIds.has(person.id)
                        return (
                          <label
                            key={person.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                              isSelected
                                ? "border-primary/30 bg-primary/5"
                                : "border-transparent hover:bg-muted/60"
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {person.firstName} {person.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(person.dailyRate ?? 0)}/day
                              </span>
                            </span>
                            <Switch checked={isSelected} onCheckedChange={() => toggleStaff(person.id)} />
                          </label>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card size="sm" className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <CalendarDaysIcon className="size-4 text-muted-foreground" />
                    Days Worked
                  </CardTitle>
                  <CardAction>
                    <Badge variant="secondary">
                      {dayCount} day{dayCount === 1 ? "" : "s"}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-1 items-center justify-center">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates ?? [])}
                    disabled={{ after: new Date() }}
                  />
                </CardContent>
              </Card>
            </div>

            {canSubmit ? (
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-sm">Summary</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Days</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {includedStaff.map((person) => (
                        <TableRow key={person.id}>
                          <TableCell>
                            {person.firstName} {person.lastName}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {dayCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency((person.dailyRate ?? 0) * dayCount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between rounded-lg bg-status-success/10 px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-status-success">
                      <HandCoinsIcon className="size-4" />
                      Total payout
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-status-success">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="rounded-lg border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
                Select at least one staff member and one day to see the payout summary.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>
              <HandCoinsIcon data-icon="inline-start" />
              Run Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-status-success/10 text-status-success">
              <HandCoinsIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Run payroll for {includedStaff.length} staff member{includedStaff.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This creates {formatCurrency(totalAmount)} in "Payroll and Employee Costs" expenses —
              {" "}
              {dayCount} day{dayCount === 1 ? "" : "s"} each. This can't be undone automatically; each
              expense would need to be edited or deleted individually afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={handleConfirm}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Run Payroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
