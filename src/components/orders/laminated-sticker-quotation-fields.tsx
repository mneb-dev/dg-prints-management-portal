import { CheckIcon } from "lucide-react"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { calculateLaminatedStickerQuotation } from "@/lib/laminated-sticker-quotation"
import type { PricingEntry } from "@/lib/products"
import { STICKER_UNITS, type StickerUnit } from "@/lib/sticker-quotation"
import { cn, formatCurrency } from "@/lib/utils"

export function LaminatedStickerQuotationFields({
  width,
  onWidthChange,
  height,
  onHeightChange,
  unit,
  onUnitChange,
  candidates,
  selectedEntryId,
  onSelectPackage,
  showAmount = false,
  quantity,
  onQuantityChange,
}: {
  width: string
  onWidthChange: (value: string) => void
  height: string
  onHeightChange: (value: string) => void
  unit: StickerUnit
  onUnitChange: (value: StickerUnit) => void
  candidates: PricingEntry[]
  selectedEntryId?: string | null
  onSelectPackage?: (entryId: string) => void
  showAmount?: boolean
  quantity?: string
  onQuantityChange?: (value: string) => void
}) {
  const w = Number(width)
  const h = Number(height)
  const hasValidSize = w > 0 && h > 0
  const hasValidPrice = candidates.length > 0
  const singleCandidate = candidates.length === 1 ? candidates[0] : null
  const singleQuantity =
    hasValidSize && singleCandidate
      ? calculateLaminatedStickerQuotation(w, h, unit, singleCandidate.price)
      : null

  return (
    <Field>
      <FieldLabel>Laminated Sticker Quotation</FieldLabel>
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
        {onQuantityChange && (
          <>
            <span className="text-sm text-muted-foreground">Qty</span>
            <Input
              type="number"
              min={1}
              step="1"
              value={quantity}
              onChange={(event) => onQuantityChange(event.target.value)}
              className="w-16"
            />
          </>
        )}
      </div>

      {!hasValidSize && (
        <FieldDescription>Enter width and height to see the quote.</FieldDescription>
      )}
      {hasValidSize && !hasValidPrice && (
        <FieldDescription>Select a package price to see the quote.</FieldDescription>
      )}

      {hasValidSize && singleCandidate && singleQuantity !== null && (
        <>
          <div className="flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left">
            <span className="text-sm font-medium">
              {singleCandidate.packageName ?? formatCurrency(singleCandidate.price)}
              {showAmount
                ? ` — ${formatCurrency(singleCandidate.price)}`
                : " package"}
            </span>
            <span className="text-sm text-muted-foreground">{singleQuantity} pcs</span>
          </div>
          <FieldDescription>
            Estimate only, based on sticker size — doesn't affect this order's price.
          </FieldDescription>
        </>
      )}

      {hasValidSize && candidates.length > 1 && (
        <>
          <div className="grid grid-cols-1 gap-2 @sm/field-group:grid-cols-3">
            {candidates.map((candidate) => {
              const isSelected = selectedEntryId === candidate.id
              const candidateQuantity = calculateLaminatedStickerQuotation(w, h, unit, candidate.price)
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSelectPackage?.(candidate.id)}
                  className={cn(
                    "relative flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left outline-none transition-colors",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    !isSelected && "hover:bg-muted/50",
                    isSelected && "border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/10"
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="size-3" />
                      <span className="sr-only">Selected</span>
                    </span>
                  )}
                  <span className="text-sm font-medium">
                    {candidate.packageName ?? formatCurrency(candidate.price)}
                    {showAmount ? ` — ${formatCurrency(candidate.price)}` : " package"}
                  </span>
                  <span className="text-sm text-muted-foreground">{candidateQuantity} pcs</span>
                </button>
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
