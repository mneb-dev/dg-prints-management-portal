import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  calculateStickerQuotation,
  PACKAGE_TIERS,
  STICKER_UNITS,
  type StickerQuotation,
  type StickerUnit,
} from "@/lib/sticker-quotation"
import { cn, formatCurrency } from "@/lib/utils"

export function StickerQuotationFields({
  width,
  onWidthChange,
  height,
  onHeightChange,
  unit,
  onUnitChange,
  selectedPackage,
}: {
  width: string
  onWidthChange: (value: string) => void
  height: string
  onHeightChange: (value: string) => void
  unit: StickerUnit
  onUnitChange: (value: StickerUnit) => void
  selectedPackage: keyof StickerQuotation | null
}) {
  const w = Number(width)
  const h = Number(height)
  const hasValidSize = w > 0 && h > 0
  const quotation = hasValidSize ? calculateStickerQuotation(w, h, unit) : null

  return (
    <Field>
      <FieldLabel>Sticker Quotation</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={width}
          onChange={(event) => onWidthChange(event.target.value)}
          placeholder="Width"
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">×</span>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={height}
          onChange={(event) => onHeightChange(event.target.value)}
          placeholder="Height"
          className="w-20"
        />
        <Select value={unit} onValueChange={(value) => onUnitChange(value as StickerUnit)}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STICKER_UNITS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasValidSize && (
        <FieldDescription>Enter width and height to see package quotes.</FieldDescription>
      )}

      {quotation && (
        <>
          <div className="grid grid-cols-1 gap-2 @sm/field-group:grid-cols-3">
            {PACKAGE_TIERS.map((tier) => {
              const result = quotation[tier.key]
              const isSelected = selectedPackage === tier.key
              return (
                <div
                  key={tier.key}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left",
                    isSelected && "border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/10"
                  )}
                >
                  <span className="text-sm font-medium">{formatCurrency(tier.price)} package</span>
                  <span className="text-sm text-muted-foreground">
                    {result.quantity} pcs + {result.free} pcs free
                  </span>
                </div>
              )
            })}
          </div>
          <FieldDescription>
            Estimate only, based on sticker size — doesn't affect this order's price.
          </FieldDescription>
        </>
      )}
    </Field>
  )
}
