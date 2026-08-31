import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Product } from "@/lib/products"

export function ProductOptionsFields({
  product,
  values,
  onChange,
  excludeOptionIds,
}: {
  product: Product
  values: Record<string, string>
  onChange: (optionId: string, value: string) => void
  excludeOptionIds?: string[]
}) {
  const options = excludeOptionIds
    ? product.options.filter((option) => !excludeOptionIds.includes(option.id))
    : product.options

  if (options.length === 0) return null

  return (
    <>
      {options.map((option) => (
        <Field key={option.id}>
          <FieldLabel htmlFor={`order-option-${option.id}`}>
            {option.name}
            {option.required && " *"}
          </FieldLabel>
          <Select
            value={values[option.id] ?? ""}
            onValueChange={(value) => onChange(option.id, value as string)}
          >
            <SelectTrigger id={`order-option-${option.id}`} className="w-full">
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
        </Field>
      ))}
    </>
  )
}
