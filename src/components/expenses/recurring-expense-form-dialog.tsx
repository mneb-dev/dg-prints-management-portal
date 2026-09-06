import { useEffect, useState } from "react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
  useRecurringExpenseActions,
  type ExpensePaymentMethod,
  type RecurrenceFrequency,
  type RecurringExpense,
  type RecurringExpenseInput,
} from "@/lib/expenses"
import { cn } from "@/lib/utils"
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
        <DialogHeader>
          <DialogTitle>{recurringExpense ? "Edit Recurring Expense" : "Add Recurring Expense"}</DialogTitle>
          <DialogDescription>
            {recurringExpense
              ? "Update this recurring expense's schedule and details."
              : "Set up an expense that repeats automatically on a schedule."}
          </DialogDescription>
        </DialogHeader>

        <form id="recurring-expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!amountError}>
              <FieldLabel htmlFor="recurring-expense-amount">Amount</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                  ₱
                </span>
                <Input
                  id="recurring-expense-amount"
                  className="pl-6"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountInput}
                  onChange={(event) => {
                    setAmountInput(event.target.value)
                    setAmountError(null)
                  }}
                  aria-invalid={!!amountError}
                />
              </div>
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
              <FieldLabel htmlFor="recurring-expense-payment-method">Payment Method</FieldLabel>
              <ToggleGroup
                id="recurring-expense-payment-method"
                value={draft.paymentMethod ? [draft.paymentMethod] : []}
                onValueChange={(next) => {
                  const value = next[0] as ExpensePaymentMethod | undefined
                  if (value) {
                    setDraft((prev) => ({ ...prev, paymentMethod: value }))
                    setPaymentMethodError(null)
                  }
                }}
                className={cn(paymentMethodError && "rounded-lg ring-1 ring-destructive")}
              >
                {EXPENSE_PAYMENT_METHODS.map((method) => (
                  <Toggle key={method} value={method}>
                    {method}
                  </Toggle>
                ))}
              </ToggleGroup>
              <FieldError>{paymentMethodError}</FieldError>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="recurring-expense-frequency">Frequency</FieldLabel>
                <Select
                  value={draft.frequency}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, frequency: value as RecurrenceFrequency }))
                  }
                >
                  <SelectTrigger id="recurring-expense-frequency" className="w-full">
                    <SelectValue>
                      {(value: string) => RECURRENCE_FREQUENCY_LABELS[value as RecurrenceFrequency]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_FREQUENCIES.map((frequency) => (
                      <SelectItem key={frequency} value={frequency}>
                        {RECURRENCE_FREQUENCY_LABELS[frequency]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={!!startDateError}>
                <FieldLabel htmlFor="recurring-expense-start-date">Start Date</FieldLabel>
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

            <Field data-invalid={!!notesError}>
              <FieldLabel htmlFor="recurring-expense-notes">Notes (optional)</FieldLabel>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="recurring-expense-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Saving..." : "Save Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
