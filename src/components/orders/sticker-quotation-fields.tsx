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
import type { PricingEntry } from "@/lib/products"
import {
  calculateStickerPackageResult,
  calculateStickerQuotation,
  nearestCandidateForTier,
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
  candidates,
  onSelectPackage,
  selectable = false,
  selectedEntryId,
  quantity,
  onQuantityChange,
}: {
  width: string
  onWidthChange: (value: string) => void
  height: string
  onHeightChange: (value: string) => void
  unit: StickerUnit
  onUnitChange: (value: StickerUnit) => void
  selectedPackage: keyof StickerQuotation | null
  candidates: PricingEntry[]
  onSelectPackage?: (entryId: string) => void
  selectable?: boolean
  selectedEntryId?: string | null
  quantity?: string
  onQuantityChange?: (value: string) => void
}) {
  const w = Number(width)
  const h = Number(height)
  const hasValidSize = w > 0 && h > 0
  const quotation = hasValidSize && !selectable ? calculateStickerQuotation(w, h, unit) : null

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
        <FieldDescription>Enter width and height to see package quotes.</FieldDescription>
      )}

      {hasValidSize && selectable && candidates.length === 0 && (
        <FieldDescription>This product has no package pricing configured.</FieldDescription>
      )}

      {hasValidSize && selectable && candidates.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-2 @sm/field-group:grid-cols-3">
            {candidates.map((candidate) => {
              const isSelected = selectedEntryId === candidate.id
              const result = calculateStickerPackageResult(w, h, unit, candidate.price)
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
                    {candidate.packageName ?? formatCurrency(candidate.price)} — {formatCurrency(candidate.price)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {result.quantity} pcs + {result.free} pcs free
                  </span>
                </button>
              )
            })}
          </div>
          <FieldDescription>
            Estimate only, based on sticker size — doesn't affect this order's price.
          </FieldDescription>
        </>
      )}

      {quotation && (
        <>
          <div className="grid grid-cols-1 gap-2 @sm/field-group:grid-cols-3">
            {PACKAGE_TIERS.map((tier) => {
              const result = quotation[tier.key]
              const isSelected = selectedPackage === tier.key
              const matchedCandidate = nearestCandidateForTier(tier.price, candidates)
              const cardContent = (
                <>
                  {isSelected && (
                    <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="size-3" />
                      <span className="sr-only">Selected</span>
                    </span>
                  )}
                  <span className="text-sm font-medium">{formatCurrency(tier.price)} package</span>
                  <span className="text-sm text-muted-foreground">
                    {result.quantity} pcs + {result.free} pcs free
                  </span>
                </>
              )

              // Read-only context (e.g. the Calculator page): no selection is possible, so
              // render a plain card instead of a disabled button — a disabled button's dimmed
              // text made these unreadable even though nothing here was ever clickable.
              if (!onSelectPackage) {
                return (
                  <div
                    key={tier.key}
                    className={cn(
                      "relative flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left",
                      isSelected && "border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/10"
                    )}
                  >
                    {cardContent}
                  </div>
                )
              }

              return (
                <button
                  key={tier.key}
                  type="button"
                  disabled={!matchedCandidate}
                  onClick={() => matchedCandidate && onSelectPackage(matchedCandidate.id)}
                  className={cn(
                    "relative flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left outline-none transition-colors",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:pointer-events-none disabled:opacity-50",
                    !isSelected && matchedCandidate && "hover:bg-muted/50",
                    isSelected && "border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/10"
                  )}
                >
                  {cardContent}
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
