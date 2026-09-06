import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import type { Product } from "@/lib/products"

// A handful of values reads and picks faster as single-click toggle buttons than as a
// dropdown that must be opened first; past this many, the row would wrap awkwardly and a
// dropdown scans better (e.g. Sintra's 12-value "Thickness | Size").
const MAX_TOGGLE_VALUES = 4

export function ProductOptionsFields({
  product,
  values,
  onChange,
  excludeOptionIds,
  idPrefix = "",
}: {
  product: Product
  values: Record<string, string>
  onChange: (optionId: string, value: string) => void
  excludeOptionIds?: string[]
  idPrefix?: string
}) {
  const options = excludeOptionIds
    ? product.options.filter((option) => !excludeOptionIds.includes(option.id))
    : product.options

  if (options.length === 0) return null

  return (
    <>
      {options.map((option) => {
        const fieldId = `${idPrefix}order-option-${option.id}`
        const useToggleGroup = option.values.length >= 2 && option.values.length <= MAX_TOGGLE_VALUES

        return (
          <Field key={option.id}>
            <FieldLabel htmlFor={fieldId}>
              {option.name}
              {option.required && " *"}
            </FieldLabel>
            {useToggleGroup ? (
              <ToggleGroup
                id={fieldId}
                value={values[option.id] ? [values[option.id]] : []}
                onValueChange={(next) => onChange(option.id, next[0] ?? "")}
              >
                {option.values.map((value) => (
                  <Toggle key={value} value={value}>
                    {value}
                  </Toggle>
                ))}
              </ToggleGroup>
            ) : (
              <Select
                value={values[option.id] ?? ""}
                onValueChange={(value) => onChange(option.id, value as string)}
              >
                <SelectTrigger id={fieldId} className="w-full">
                  <SelectValue placeholder={`Select ${option.name}`} />
                </SelectTrigger>
                <SelectContent>
                  {option.values.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
        )
      })}
    </>
  )
}
