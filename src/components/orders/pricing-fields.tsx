import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LENGTH_UNITS, type LengthUnit } from "@/lib/length-units"
import type { PricingResolution } from "@/lib/pricing-resolver"
import { formatCurrency } from "@/lib/utils"

const SIZE_UNITS = ["in", "cm"] as const
export type SizeUnit = (typeof SIZE_UNITS)[number]

export function PricingFields({
  resolution,
  packageEntryId,
  onPackageEntryIdChange,
  width,
  onWidthChange,
  height,
  onHeightChange,
  dimensionUnit,
  onDimensionUnitChange,
  quantity,
  onQuantityChange,
  hidePackageSelector = false,
  hideQuantity = false,
}: {
  resolution: PricingResolution
  packageEntryId: string
  onPackageEntryIdChange: (id: string) => void
  width: string
  onWidthChange: (value: string) => void
  height: string
  onHeightChange: (value: string) => void
  dimensionUnit: LengthUnit
  onDimensionUnitChange: (value: LengthUnit) => void
  quantity: string
  onQuantityChange: (value: string) => void
  hidePackageSelector?: boolean
  hideQuantity?: boolean
}) {
  if (resolution.kind === "none") {
    return (
      <p className="text-sm text-muted-foreground">
        Select all required options to see pricing.
      </p>
    )
  }

  const showsDimensions = resolution.kind === "auto" && resolution.entry.unit === "sq.ft."

  return (
    <>
      {!hidePackageSelector && resolution.kind === "package" && (
        <Field>
          <FieldLabel htmlFor="order-package">Package</FieldLabel>
          <Select value={packageEntryId} onValueChange={(value) => onPackageEntryIdChange(value as string)}>
            <SelectTrigger id="order-package" className="w-full">
              <SelectValue placeholder="Select a package">
                {(value: string | null) => {
                  const entry = resolution.candidates.find((candidate) => candidate.id === value)
                  return entry ? `${entry.packageName} — ${formatCurrency(entry.price)}` : "Select a package"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {resolution.candidates.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.packageName} — {formatCurrency(entry.price)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {!hidePackageSelector && resolution.kind === "auto" && resolution.entry.pricingType === "Package" && (
        <p className="text-sm text-muted-foreground">
          {resolution.entry.packageName} — {formatCurrency(resolution.entry.price)}
        </p>
      )}

      {showsDimensions && (
        <div className="grid grid-cols-3 gap-4">
          <Field>
            <FieldLabel htmlFor="order-width">Width</FieldLabel>
            <Input
              id="order-width"
              type="number"
              min={0}
              step="0.01"
              value={width}
              onChange={(event) => onWidthChange(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="order-height">Height</FieldLabel>
            <Input
              id="order-height"
              type="number"
              min={0}
              step="0.01"
              value={height}
              onChange={(event) => onHeightChange(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="order-dimension-unit">Unit</FieldLabel>
            <Select
              value={dimensionUnit}
              onValueChange={(value) => onDimensionUnitChange(value as LengthUnit)}
            >
              <SelectTrigger id="order-dimension-unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENGTH_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {!hideQuantity && (
        <Field>
          <FieldLabel htmlFor="order-quantity">Quantity</FieldLabel>
          <Input
            id="order-quantity"
            type="number"
            min={1}
            step="1"
            value={quantity}
            onChange={(event) => onQuantityChange(event.target.value)}
          />
        </Field>
      )}
    </>
  )
}
