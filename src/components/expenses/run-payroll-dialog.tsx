import { useEffect, useState } from "react"
import { addDays, eachDayOfInterval, format, isSameDay, min, startOfWeek } from "date-fns"
import { CalendarDaysIcon, CheckIcon, HandCoinsIcon, ReceiptTextIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"

import { ChoiceTile } from "@/components/choice-tile"
import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import { FormDialogHeader } from "@/components/form-dialog-header"
import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
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

/** A staff member's paid day total: 1 per selected date, 0.5 for any date the admin marked as a
 * half day for that specific person (others selected for the same date are unaffected). */
function staffDayTotal(
  personId: string,
  dates: Date[],
  halfDayOverrides: Record<string, Set<string>>
): number {
  const half = halfDayOverrides[personId]
  if (!half || half.size === 0) return dates.length
  return dates.reduce((sum, date) => sum + (half.has(format(date, "yyyy-MM-dd")) ? 0.5 : 1), 0)
}

function formatDays(total: number): string {
  return Number.isInteger(total) ? String(total) : total.toFixed(1)
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
  const { addExpenses } = useExpenseActions()

  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set())
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [halfDayOverrides, setHalfDayOverrides] = useState<Record<string, Set<string>>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedStaffIds(new Set())
    setSelectedDates(defaultWorkedDates())
    setHalfDayOverrides({})
  }, [open])

  function toggleStaff(id: string) {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    // Half-day marks are staff-specific and meaningless once that person is removed from the run.
    setHalfDayOverrides((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const allSelected = staff.length > 0 && staff.every((person) => selectedStaffIds.has(person.id))

  function toggleAllStaff() {
    if (allSelected) {
      setSelectedStaffIds(new Set())
      // Same as toggleStaff: half-day marks go with the people removed from the run.
      setHalfDayOverrides({})
    } else {
      setSelectedStaffIds(new Set(staff.map((person) => person.id)))
    }
  }

  function handleDatesChange(dates: Date[] | undefined) {
    const next = dates ?? []
    setSelectedDates(next)
    // Drop half-day marks for any date that's no longer part of the selected set, so a date
    // removed and later re-added doesn't silently come back in as a stale half day.
    const nextIso = new Set(next.map((date) => format(date, "yyyy-MM-dd")))
    setHalfDayOverrides((prev) => {
      const pruned: Record<string, Set<string>> = {}
      let changed = false
      for (const [staffId, isoDates] of Object.entries(prev)) {
        const filtered = new Set([...isoDates].filter((iso) => nextIso.has(iso)))
        if (filtered.size !== isoDates.size) changed = true
        if (filtered.size > 0) pruned[staffId] = filtered
      }
      return changed ? pruned : prev
    })
  }

  function toggleHalfDay(personId: string, iso: string, half: boolean) {
    setHalfDayOverrides((prev) => {
      const next = { ...prev }
      const current = new Set(next[personId] ?? [])
      if (half) current.add(iso)
      else current.delete(iso)
      if (current.size > 0) next[personId] = current
      else delete next[personId]
      return next
    })
  }

  const includedStaff = staff.filter((person) => selectedStaffIds.has(person.id))
  const dayCount = selectedDates.length
  const totalAmount = includedStaff.reduce(
    (sum, person) =>
      sum + (person.dailyRate ?? 0) * staffDayTotal(person.id, selectedDates, halfDayOverrides),
    0
  )
  const canSubmit = includedStaff.length > 0 && dayCount > 0

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const dateLabel = formatDateRanges(selectedDates)

      await addExpenses(
        includedStaff.map((person) => {
          const personTotal = staffDayTotal(person.id, selectedDates, halfDayOverrides)
          const halfDates = selectedDates
            .filter((date) => halfDayOverrides[person.id]?.has(format(date, "yyyy-MM-dd")))
            .sort((a, b) => a.getTime() - b.getTime())
          const halfLabel =
            halfDates.length > 0
              ? `, half day: ${halfDates.map((date) => format(date, "MMM d")).join(", ")}`
              : ""

          return {
            date: today,
            amount: (person.dailyRate ?? 0) * personTotal,
            category: "Payroll and Employee Costs",
            paymentMethod: "Cash",
            notes: `Payroll — ${person.firstName} ${person.lastName} (${formatDays(personTotal)} day${personTotal === 1 ? "" : "s"}: ${dateLabel}${halfLabel})`,
          }
        })
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
          <FormDialogHeader
            icon={HandCoinsIcon}
            title={<>Run payroll</>}
            description={<>Select staff and the days they reported to work — pay is calculated automatically as daily rate × days. Click a staff member's day count in the summary to mark half days.</>}
          />

          <DialogBody className="flex flex-col gap-4">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card size="sm" className="flex flex-col">
                <CardHeader>
                  <OrderFormSectionHeader
                    icon={UsersIcon}
                    title="Staff"
                    description={`${selectedStaffIds.size} selected`}
                  />
                  {staff.length > 0 && (
                    <CardAction>
                      <Button type="button" variant="ghost" size="sm" onClick={toggleAllStaff}>
                        {allSelected ? "Clear" : "Select all"}
                      </Button>
                    </CardAction>
                  )}
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
                          <button
                            key={person.id}
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            onClick={() => toggleStaff(person.id)}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                              isSelected
                                ? "border-primary bg-accent/50"
                                : "border-border hover:bg-accent/30"
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {person.firstName} {person.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {person.dailyRate ? `${formatCurrency(person.dailyRate)}/day` : "—"}
                              </span>
                            </span>
                            <span
                              aria-hidden
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"
                              )}
                            >
                              {isSelected && <CheckIcon className="size-3 stroke-3" />}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card size="sm" className="flex flex-col">
                <CardHeader>
                  <OrderFormSectionHeader
                    icon={CalendarDaysIcon}
                    title="Days worked"
                    description={`${dayCount} ${dayCount === 1 ? "day" : "days"} selected`}
                  />
                </CardHeader>
                <CardContent className="flex flex-1 items-center justify-center">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={handleDatesChange}
                    disabled={{ after: new Date() }}
                  />
                </CardContent>
              </Card>
            </div>

            {canSubmit ? (
              <Card size="sm">
                <CardHeader>
                  <OrderFormSectionHeader
                    icon={ReceiptTextIcon}
                    title="Summary"
                    description="Click a day count to mark half days."
                  />
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-medium text-muted-foreground">Staff</TableHead>
                        <TableHead className="text-right text-xs font-medium text-muted-foreground">Days</TableHead>
                        <TableHead className="text-right text-xs font-medium text-muted-foreground">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {includedStaff.map((person) => {
                        const personTotal = staffDayTotal(person.id, selectedDates, halfDayOverrides)
                        const halfCount = halfDayOverrides[person.id]?.size ?? 0
                        return (
                          <TableRow key={person.id}>
                            <TableCell>
                              {person.firstName} {person.lastName}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              <Popover>
                                <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 underline decoration-dotted underline-offset-4 hover:bg-muted hover:text-foreground">
                                  {formatDays(personTotal)}
                                  {halfCount > 0 && (
                                    <Badge variant="secondary" className="px-1.5 text-[10px]">
                                      {halfCount} half
                                    </Badge>
                                  )}
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-64 p-3">
                                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    Mark half days for {person.firstName}
                                  </p>
                                  <div className="flex flex-col gap-1">
                                    {selectedDates
                                      .slice()
                                      .sort((a, b) => a.getTime() - b.getTime())
                                      .map((date) => {
                                        const iso = format(date, "yyyy-MM-dd")
                                        const isHalf = halfDayOverrides[person.id]?.has(iso) ?? false
                                        return (
                                          <div key={iso} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="text-foreground">{format(date, "EEE, MMM d")}</span>
                                            <ChoiceTile
                                              className="h-7 px-2 text-xs"
                                              pressed={isHalf}
                                              onPressedChange={(pressed) => toggleHalfDay(person.id, iso, pressed)}
                                            >
                                              Half day
                                            </ChoiceTile>
                                          </div>
                                        )
                                      })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency((person.dailyRate ?? 0) * personTotal)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex items-baseline justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">
                      Total payout · {includedStaff.length} {includedStaff.length === 1 ? "person" : "people"}
                    </span>
                    <span className="text-xl font-semibold tabular-nums">{formatCurrency(totalAmount)}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="rounded-lg border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
                Select at least one staff member and one day to see the payout summary.
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>
              <HandCoinsIcon data-icon="inline-start" />
              Run payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tone="primary"
        icon={HandCoinsIcon}
        title={`Run payroll for ${includedStaff.length} staff ${includedStaff.length === 1 ? "member" : "members"}?`}
        description={
          <>
            Creates <Name>{formatCurrency(totalAmount)}</Name> in payroll expenses, based on days worked out of{" "}
            {dayCount} selected {dayCount === 1 ? "day" : "days"} (half-days applied). To undo, each expense
            must be edited or deleted one by one.
          </>
        }
        confirmLabel="Yes, run payroll"
        pendingLabel="Running…"
        cancelLabel="No, go back"
        isPending={isSubmitting}
        onConfirm={handleConfirm}
      />
    </>
  )
}
