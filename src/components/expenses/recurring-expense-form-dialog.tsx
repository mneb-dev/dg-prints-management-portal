import { CalendarIcon, RepeatIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { addDays, addMonths, addWeeks, format, parseISO } from "date-fns"
import { toast } from "sonner"

import {
  EXPENSE_NOTES_MAX_LENGTH,
  ExpenseAmountField,
  ExpenseCategoryField,
  ExpenseNotesField,
  PaymentMethodTiles,
} from "@/components/expenses/expense-fields"
import { FormDialogHeader } from "@/components/form-dialog-header"
import { FormSection } from "@/components/form-section"
import { RecapStrip } from "@/components/recap-strip"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import {
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
  useRecurringExpenseActions,
  type RecurrenceFrequency,
  type RecurringExpense,
  type RecurringExpenseInput,
} from "@/lib/expenses"
import { useEnabledPaymentMethods } from "@/lib/payment-methods"
import { cn, formatCurrency } from "@/lib/utils"
import { maxLengthMessage, parsePositiveAmount, positiveAmountMessage, requiredMessage } from "@/lib/validation"

const UPCOMING_RUN_COUNT = 3

const STEP_BY_FREQUENCY: Record<RecurrenceFrequency, (date: Date, amount: number) => Date> = {
  daily: addDays,
  weekly: addWeeks,
  monthly: addMonths,
}

/** The next few run dates, starting at `first` — a preview only; the server owns the schedule. */
function upcomingRuns(first: string, frequency: RecurrenceFrequency): Date[] {
  const start = parseISO(first)
  return Array.from({ length: UPCOMING_RUN_COUNT }, (_, index) => STEP_BY_FREQUENCY[frequency](start, index))
}

function emptyDraft(): RecurringExpenseInput {
  return {
    amount: 0,
    category: "",
    paymentMethod: "",
    notes: "",
    frequency: "monthly",
    startDate: format(new Date(), "yyyy-MM-dd"),
  }
}

function draftFromRecurringExpense(recurring: RecurringExpense): RecurringExpenseInput {
  return {
    amount: recurring.amount,
    category: recurring.category,
    paymentMethod: recurring.paymentMethod,
    notes: recurring.notes,
    frequency: recurring.frequency,
    startDate: recurring.startDate,
  }
}

export function RecurringExpenseFormDialog({
  open,
  onOpenChange,
  recurringExpense,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recurringExpense: RecurringExpense | null
  onSaved?: () => void
}) {
  const { addRecurringExpense, updateRecurringExpense } = useRecurringExpenseActions()
  const { paymentMethods: enabledMethods } = useEnabledPaymentMethods()
  const [draft, setDraft] = useState<RecurringExpenseInput>(emptyDraft)
  const [amountInput, setAmountInput] = useState("")
  const [amountError, setAmountError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null)
  const [startDateError, setStartDateError] = useState<string | null>(null)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const next = recurringExpense ? draftFromRecurringExpense(recurringExpense) : emptyDraft()
    setDraft(next)
    setAmountInput(recurringExpense ? String(recurringExpense.amount) : "")
    setAmountError(null)
    setCategoryError(null)
    setPaymentMethodError(null)
    setStartDateError(null)
    setNotesError(null)
  }, [open, recurringExpense])

  // Upcoming runs preview. An existing schedule continues from its next run, unless its start
  // date has just been changed here; a new one starts on its start date.
  const previewAmount = parsePositiveAmount(amountInput)
  const firstRun =
    recurringExpense && draft.startDate === recurringExpense.startDate
      ? recurringExpense.nextRunDate
      : draft.startDate
  const runs = previewAmount !== null && firstRun ? upcomingRuns(firstRun, draft.frequency) : null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const amount = parsePositiveAmount(amountInput)
    if (amount === null) {
      setAmountError(positiveAmountMessage("amount"))
      return
    }
    if (!draft.category) {
      setCategoryError(requiredMessage("Category"))
      return
    }
    if (!draft.paymentMethod) {
      setPaymentMethodError(requiredMessage("Payment method"))
      return
    }
    if (!draft.startDate) {
      setStartDateError(requiredMessage("Start date"))
      return
    }
    if (draft.notes.length > EXPENSE_NOTES_MAX_LENGTH) {
      setNotesError(maxLengthMessage("Notes", EXPENSE_NOTES_MAX_LENGTH))
      return
    }

    const payload: RecurringExpenseInput = { ...draft, amount }

    setIsSubmitting(true)
    try {
      if (recurringExpense) {
        await updateRecurringExpense(recurringExpense.id, payload)
        toast.success("Recurring expense updated.")
      } else {
        await addRecurringExpense(payload)
        toast.success("Recurring expense created.")
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save recurring expense.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <FormDialogHeader
          icon={RepeatIcon}
          title={recurringExpense ? "Edit recurring expense" : "New recurring expense"}
          description={
            recurringExpense
              ? "Update this schedule's details and timing."
              : "Set up an expense that's logged automatically on a schedule, like rent or a subscription."
          }
        />

        <DialogBody>
          <form id="recurring-expense-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
            <FormSection step={1} title="Expense" description="What gets logged each time it runs.">
              <FieldGroup>
                <ExpenseAmountField
                  id="recurring-expense-amount"
                  value={amountInput}
                  error={amountError}
                  autoFocus={!recurringExpense}
                  onChange={(value) => {
                    setAmountInput(value)
                    setAmountError(null)
                  }}
                />
                <ExpenseCategoryField
                  id="recurring-expense-category"
                  value={draft.category}
                  error={categoryError}
                  onChange={(value) => {
                    setDraft((prev) => ({ ...prev, category: value }))
                    setCategoryError(null)
                  }}
                />
                <PaymentMethodTiles
                  id="recurring-expense-payment-method"
                  value={draft.paymentMethod}
                  methods={enabledMethods}
                  error={paymentMethodError}
                  onChange={(value) => {
                    setDraft((prev) => ({ ...prev, paymentMethod: value }))
                    setPaymentMethodError(null)
                  }}
                />
                <ExpenseNotesField
                  id="recurring-expense-notes"
                  value={draft.notes}
                  error={notesError}
                  onChange={(value) => {
                    setDraft((prev) => ({ ...prev, notes: value }))
                    setNotesError(null)
                  }}
                />
              </FieldGroup>
            </FormSection>

            <FormSection step={2} title="Schedule" description="How often it repeats and when it starts.">
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel id="recurring-expense-frequency-label">Frequency</FieldLabel>
                    <ToggleGroup
                      aria-labelledby="recurring-expense-frequency-label"
                      value={[draft.frequency]}
                      onValueChange={(next) => {
                        const value = next[0] as RecurrenceFrequency | undefined
                        if (value) setDraft((prev) => ({ ...prev, frequency: value }))
                      }}
                      className={cn(SEGMENT_TRACK_CLASS, "w-full")}
                    >
                      {RECURRENCE_FREQUENCIES.map((frequency) => (
                        <Toggle key={frequency} value={frequency} className={cn(SEGMENT_CLASS, "flex-1")}>
                          {RECURRENCE_FREQUENCY_LABELS[frequency]}
                        </Toggle>
                      ))}
                    </ToggleGroup>
                  </Field>

                  <Field data-invalid={!!startDateError}>
                    <FieldLabel htmlFor="recurring-expense-start-date">Start date</FieldLabel>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger
                        id="recurring-expense-start-date"
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start font-normal"
                            aria-invalid={!!startDateError}
                          />
                        }
                      >
                        <CalendarIcon data-icon="inline-start" className="text-muted-foreground" />
                        {draft.startDate ? format(parseISO(draft.startDate), "MMM d, yyyy") : "Select date"}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={draft.startDate ? parseISO(draft.startDate) : undefined}
                          onSelect={(date) => {
                            setDraft((prev) => ({
                              ...prev,
                              startDate: date ? format(date, "yyyy-MM-dd") : "",
                            }))
                            setStartDateError(null)
                            setDatePickerOpen(false)
                          }}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FieldError>{startDateError ?? undefined}</FieldError>
                  </Field>
                </div>

                {runs && previewAmount !== null ? (
                  <RecapStrip
                    key={`${draft.frequency}-${firstRun}`}
                    items={[
                      { label: "Each run", value: formatCurrency(previewAmount), emphasis: true },
                      { label: "Repeats", value: RECURRENCE_FREQUENCY_LABELS[draft.frequency] },
                      {
                        label: "Next runs",
                        value: (
                          <span className="font-medium">
                            {runs.map((date) => format(date, "MMM d")).join(" · ")}
                          </span>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
                    Enter an amount to preview the upcoming runs.
                  </p>
                )}
              </FieldGroup>
            </FormSection>
          </form>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="recurring-expense-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Saving…" : recurringExpense ? "Save changes" : "Create schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
