import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { QuantityInput } from "@/components/ui/quantity-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  calculateSintraCustomPrice,
  SINTRA_THICKNESSES,
  type SintraThickness,
} from "@/lib/sintra-board-pricing"
import { formatCurrency } from "@/lib/utils"

export function SintraBoardCustomFields({
  width,
  onWidthChange,
  height,
  onHeightChange,
  thickness,
  onThicknessChange,
  backToBack,
  onBackToBackChange,
  quantity,
  onQuantityChange,
  idPrefix = "",
  onClear,
}: {
  width: string
  onWidthChange: (value: string) => void
  height: string
  onHeightChange: (value: string) => void
  thickness: SintraThickness
  onThicknessChange: (value: SintraThickness) => void
  backToBack: boolean
  onBackToBackChange: (value: boolean) => void
  quantity?: string
  onQuantityChange?: (value: string) => void
  idPrefix?: string
  onClear?: () => void
}) {
  const w = Number(width)
  const h = Number(height)
  const hasValidSize = w > 0 && h > 0
  const price = hasValidSize
    ? calculateSintraCustomPrice({ width: w, height: h, thickness, backToBack })
    : null

  return (
    <>
      <div className={`grid gap-4 ${quantity !== undefined && onQuantityChange ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-2"}`}>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}sintra-custom-width`}>Width (in)</FieldLabel>
          <Input
            id={`${idPrefix}sintra-custom-width`}
            type="number"
            min={0}
            step="0.01"
            value={width}
            onChange={(event) => onWidthChange(event.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={`${idPrefix}sintra-custom-height`}>Height (in)</FieldLabel>
            {onClear && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                Clear
              </Button>
            )}
          </div>
          <Input
            id={`${idPrefix}sintra-custom-height`}
            type="number"
            min={0}
            step="0.01"
            value={height}
            onChange={(event) => onHeightChange(event.target.value)}
          />
        </Field>
        {quantity !== undefined && onQuantityChange && (
          <Field>
            <FieldLabel htmlFor={`${idPrefix}sintra-custom-quantity`}>Quantity</FieldLabel>
            <QuantityInput
              id={`${idPrefix}sintra-custom-quantity`}
              value={quantity ?? ""}
              onChange={onQuantityChange}
            />
          </Field>
        )}
      </div>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}sintra-custom-thickness`}>Thickness</FieldLabel>
        <Select value={thickness} onValueChange={(value) => onThicknessChange(value as SintraThickness)}>
          <SelectTrigger id={`${idPrefix}sintra-custom-thickness`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SINTRA_THICKNESSES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch checked={backToBack} onCheckedChange={(checked) => onBackToBackChange(!!checked)} />
        Back to back print
      </label>

      {price !== null ? (
        <p className="text-2xl font-semibold">{formatCurrency(price)}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Enter width and height to see the price.</p>
      )}
    </>
  )
}
