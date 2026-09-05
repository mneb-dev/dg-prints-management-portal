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
  useExpenseActions,
  type Expense,
  type ExpenseInput,
  type ExpensePaymentMethod,
} from "@/lib/expenses"
import { cn } from "@/lib/utils"
import { maxLengthMessage, parsePositiveAmount, positiveAmountMessage, requiredMessage } from "@/lib/validation"

const NOTES_MAX_LENGTH = 300

function emptyDraft(): ExpenseInput {
  return {
    date: format(new Date(), "yyyy-MM-dd"),
    amount: 0,
    category: "",
    paymentMethod: "",
    notes: "",
  }
}

function draftFromExpense(expense: Expense): ExpenseInput {
  return {
    date: expense.date,
    amount: expense.amount,
    category: expense.category,
    paymentMethod: expense.paymentMethod,
    notes: expense.notes,
  }
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: Expense | null
  onSaved?: () => void
}) {
  const { addExpense, updateExpense } = useExpenseActions()
  const [draft, setDraft] = useState<ExpenseInput>(emptyDraft)
  const [amountInput, setAmountInput] = useState("")
  const [dateError, setDateError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const next = expense ? draftFromExpense(expense) : emptyDraft()
    setDraft(next)
    setAmountInput(expense ? String(expense.amount) : "")
    setDateError(null)
    setAmountError(null)
    setCategoryError(null)
    setPaymentMethodError(null)
    setNotesError(null)
  }, [open, expense])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.date) {
      setDateError(requiredMessage("Date"))
      return
    }
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
    if (draft.notes.length > NOTES_MAX_LENGTH) {
      setNotesError(maxLengthMessage("Notes", NOTES_MAX_LENGTH))
      return
    }

    const payload: ExpenseInput = { ...draft, amount }

    setIsSubmitting(true)
    try {
      if (expense) {
        await updateExpense(expense.id, payload)
        toast.success("Expense updated.")
      } else {
        await addExpense(payload)
        toast.success("Expense created.")
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save expense.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {expense ? "Update this expense's details." : "Log a new business expense."}
          </DialogDescription>
        </DialogHeader>

        <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!dateError}>
              <FieldLabel htmlFor="expense-date">Date</FieldLabel>
              <Popover>
                <PopoverTrigger
                  id="expense-date"
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal"
                      aria-invalid={!!dateError}
                    />
                  }
                >
                  {draft.date ? format(parseISO(draft.date), "MMM d, yyyy") : "Select date"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={draft.date ? parseISO(draft.date) : undefined}
                    onSelect={(date) => {
                      setDraft((prev) => ({ ...prev, date: date ? format(date, "yyyy-MM-dd") : "" }))
                      setDateError(null)
                    }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
              <FieldError>{dateError ?? undefined}</FieldError>
            </Field>

            <Field data-invalid={!!amountError}>
              <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                  ₱
                </span>
                <Input
                  id="expense-amount"
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
              <FieldLabel htmlFor="expense-category">Category</FieldLabel>
              <Select
                value={draft.category || undefined}
                onValueChange={(value) => {
                  setDraft((prev) => ({ ...prev, category: value ?? "" }))
                  setCategoryError(null)
                }}
              >
                <SelectTrigger id="expense-category" className="w-full" aria-invalid={!!categoryError}>
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
              <FieldLabel htmlFor="expense-payment-method">Payment Method</FieldLabel>
              <ToggleGroup
                id="expense-payment-method"
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

            <Field data-invalid={!!notesError}>
              <FieldLabel htmlFor="expense-notes">Notes (optional)</FieldLabel>
              <Textarea
                id="expense-notes"
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
          <Button type="submit" form="expense-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Saving..." : "Save Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
