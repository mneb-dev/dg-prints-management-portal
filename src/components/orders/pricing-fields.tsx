import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  sizeUnit,
  onSizeUnitChange,
  quantity,
  onQuantityChange,
}: {
  resolution: PricingResolution
  packageEntryId: string
  onPackageEntryIdChange: (id: string) => void
  width: string
  onWidthChange: (value: string) => void
  height: string
  onHeightChange: (value: string) => void
  sizeUnit: SizeUnit
  onSizeUnitChange: (value: SizeUnit) => void
  quantity: string
  onQuantityChange: (value: string) => void
}) {
  if (resolution.kind === "none") {
    return (
      <p className="text-sm text-muted-foreground">
        Select all required options to see pricing.
      </p>
    )
  }

  const showsDimensions = resolution.kind === "auto" && resolution.entry.unit === "sq.ft."
  const isPackageType =
    resolution.kind === "package" ||
    (resolution.kind === "auto" && resolution.entry.pricingType === "Package")

  return (
    <>
      {resolution.kind === "package" && (
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

      {resolution.kind === "auto" && resolution.entry.pricingType === "Package" && (
        <p className="text-sm text-muted-foreground">
          {resolution.entry.packageName} — {formatCurrency(resolution.entry.price)}
        </p>
      )}

      {isPackageType && (
        <Field>
          <FieldLabel>Size (reference only)</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={width}
              onChange={(event) => onWidthChange(event.target.value)}
              placeholder="Width"
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">×</span>
            <Input
              type="number"
              min={0}
              value={height}
              onChange={(event) => onHeightChange(event.target.value)}
              placeholder="Height"
              className="w-20"
            />
            <Select value={sizeUnit} onValueChange={(value) => onSizeUnitChange(value as SizeUnit)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            For production reference only — doesn't affect the price.
          </p>
        </Field>
      )}

      {showsDimensions && (
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="order-width">Width (ft)</FieldLabel>
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
            <FieldLabel htmlFor="order-height">Height (ft)</FieldLabel>
            <Input
              id="order-height"
              type="number"
              min={0}
              step="0.01"
              value={height}
              onChange={(event) => onHeightChange(event.target.value)}
            />
          </Field>
        </div>
      )}

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
    </>
  )
}
