import { RepeatIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

import { CharCount } from "@/components/char-count"
import { ChoiceTile } from "@/components/choice-tile"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { FormDialogHeader } from "@/components/form-dialog-header"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import {
  EXPENSE_CATEGORIES,
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

const NOTES_MAX_LENGTH = 300

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

  // "Repeats monthly from Sep 23, 2026 · ₱5,000.00 each time" — only once the amount is valid.
  const previewAmount = parsePositiveAmount(amountInput)
  const scheduleSummary =
    previewAmount !== null && draft.startDate
      ? `Repeats ${RECURRENCE_FREQUENCY_LABELS[draft.frequency].toLowerCase()} from ${format(parseISO(draft.startDate), "MMM d, yyyy")} · ${formatCurrency(previewAmount)} each time`
      : null

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
    if (draft.notes.length > NOTES_MAX_LENGTH) {
      setNotesError(maxLengthMessage("Notes", NOTES_MAX_LENGTH))
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
      <DialogContent className="sm:max-w-md">
        <FormDialogHeader
          icon={RepeatIcon}
          title={<>{recurringExpense ? "Edit recurring expense" : "New recurring expense"}</>}
          description={<>{recurringExpense ? "Update this recurring expense's schedule and details." : "Set up an expense that repeats automatically on a schedule."}</>}
        />

        <DialogBody>
        <form id="recurring-expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!amountError}>
              <FieldLabel htmlFor="recurring-expense-amount">Amount</FieldLabel>
              <CurrencyInput
                id="recurring-expense-amount"
                value={amountInput}
                onChange={(event) => {
                  setAmountInput(event.target.value)
                  setAmountError(null)
                }}
                aria-invalid={!!amountError}
              />
              <FieldError>{amountError ?? undefined}</FieldError>
            </Field>

            <Field data-invalid={!!categoryError}>
              <FieldLabel htmlFor="recurring-expense-category">Category</FieldLabel>
              <Select
                value={draft.category || undefined}
                onValueChange={(value) => {
                  setDraft((prev) => ({ ...prev, category: value ?? "" }))
                  setCategoryError(null)
                }}
              >
                <SelectTrigger id="recurring-expense-category" className="w-full" aria-invalid={!!categoryError}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="min-w-64">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{categoryError}</FieldError>
            </Field>

            <Field data-invalid={!!paymentMethodError}>
              <FieldLabel htmlFor="recurring-expense-payment-method">Payment method</FieldLabel>
              <ToggleGroup
                id="recurring-expense-payment-method"
                value={draft.paymentMethod ? [draft.paymentMethod] : []}
                onValueChange={(next) => {
                  const value = next[0]
                  if (value) {
                    setDraft((prev) => ({ ...prev, paymentMethod: value }))
                    setPaymentMethodError(null)
                  }
                }}
                className={cn(
                  "flex-wrap gap-2",
                  paymentMethodError && "rounded-lg ring-1 ring-destructive ring-offset-2 ring-offset-background"
                )}
              >
                {/* Merge in the current value even if it's since been disabled/deleted in
                  Settings, so an existing schedule using a retired method still renders. */}
                {(draft.paymentMethod && !enabledMethods.includes(draft.paymentMethod)
                  ? [...enabledMethods, draft.paymentMethod]
                  : enabledMethods
                ).map((method) => (
                  <ChoiceTile key={method} value={method}>
                    {method}
                  </ChoiceTile>
                ))}
              </ToggleGroup>
              <FieldError>{paymentMethodError}</FieldError>
            </Field>

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
                <Popover>
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
                      }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                <FieldError>{startDateError ?? undefined}</FieldError>
              </Field>
            </div>

            {scheduleSummary && <p className="-mt-2 text-xs text-muted-foreground">{scheduleSummary}</p>}

            <Field data-invalid={!!notesError}>
              <div className="flex items-baseline justify-between gap-2">
                <FieldLabel htmlFor="recurring-expense-notes">
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <CharCount value={draft.notes} max={NOTES_MAX_LENGTH} />
              </div>
              <Textarea
                id="recurring-expense-notes"
                value={draft.notes}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, notes: event.target.value }))
                  setNotesError(null)
                }}
                placeholder="Vendor, reason, or other context"
                maxLength={NOTES_MAX_LENGTH}
                aria-invalid={!!notesError}
              />
              <FieldError>{notesError ?? undefined}</FieldError>
            </Field>
          </FieldGroup>
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
