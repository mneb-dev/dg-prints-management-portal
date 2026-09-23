import { ChoiceTile } from "@/components/choice-tile"
import { CharCount } from "@/components/char-count"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { EXPENSE_CATEGORIES } from "@/lib/expenses"
import { cn } from "@/lib/utils"

/** Field blocks shared by the one-off and recurring expense forms, so both read the same:
 * a large amount, a category dropdown, one-click payment tiles, and notes with a live count. */

export const EXPENSE_NOTES_MAX_LENGTH = 300

const ERROR_RING = "rounded-lg ring-1 ring-destructive ring-offset-2 ring-offset-background"

export function ExpenseAmountField({
  id,
  value,
  error,
  disabled,
  autoFocus,
  onChange,
}: {
  id: string
  value: string
  error: string | null
  disabled?: boolean
  autoFocus?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>Amount</FieldLabel>
      <CurrencyInput
        id={id}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder="0.00"
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!error}
        className="h-11 pl-7 text-lg font-semibold tabular-nums md:text-lg"
      />
      <FieldError>{error ?? undefined}</FieldError>
    </Field>
  )
}

export function ExpenseCategoryField({
  id,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string
  value: string
  error: string | null
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>Category</FieldLabel>
      <Select value={value || undefined} disabled={disabled} onValueChange={(next) => onChange(next ?? "")}>
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent className="min-w-64">
          {/* Keep a legacy category (no longer in the list) visible on an existing expense. */}
          {(value && !(EXPENSE_CATEGORIES as readonly string[]).includes(value)
            ? [...EXPENSE_CATEGORIES, value]
            : EXPENSE_CATEGORIES
          ).map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

export function PaymentMethodTiles({
  id,
  value,
  methods,
  error,
  onChange,
}: {
  id: string
  value: string
  methods: string[]
  error: string | null
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel id={`${id}-label`}>Payment method</FieldLabel>
      <ToggleGroup
        aria-labelledby={`${id}-label`}
        value={value ? [value] : []}
        onValueChange={(next) => {
          if (next[0]) onChange(next[0])
        }}
        className={cn("flex-wrap gap-2", error && ERROR_RING)}
      >
        {/* Merge in the current value even if it's since been disabled/deleted in Settings, so an
            existing record using a retired method still renders. */}
        {(value && !methods.includes(value) ? [...methods, value] : methods).map((method) => (
          <ChoiceTile key={method} value={method}>
            {method}
          </ChoiceTile>
        ))}
      </ToggleGroup>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

export function ExpenseNotesField({
  id,
  value,
  error,
  onChange,
}: {
  id: string
  value: string
  error: string | null
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel htmlFor={id}>
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <CharCount value={value} max={EXPENSE_NOTES_MAX_LENGTH} />
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Vendor, reason, or other context"
        maxLength={EXPENSE_NOTES_MAX_LENGTH}
        aria-invalid={!!error}
      />
      <FieldError>{error ?? undefined}</FieldError>
    </Field>
  )
}
