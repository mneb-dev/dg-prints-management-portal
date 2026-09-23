import { useEffect, useMemo, useState } from "react"
import { LayersIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isPackageOptionName } from "@/lib/pricing-resolver"
import type { PricingEntry, PricingType, PricingUnit, ProductOption } from "@/lib/products"
import { ALL_VARIANTS, PRICING_TYPES, PRICING_UNITS } from "@/lib/products"
import { cn, generateId } from "@/lib/utils"
import { cartesianOptionCombinations, combinationsMatch, type VariantCombination } from "@/lib/variant-matrix"

/** Units selectable for a "Per Unit" row — "Package" is reserved for the Package pricing type. */
const PER_UNIT_UNITS = PRICING_UNITS.filter((unit) => unit !== "Package")

/** Package name shown on the order side: the value of whichever option is the package-tier option
 *  (matching the naming convention `isPackageOptionName` relies on in the order form), or every value
 *  joined together when there's no such option. */
function packageNameFor(options: ProductOption[], combination: VariantCombination): string {
  const packageOption = options.find((option) => isPackageOptionName(option.name))
  const packageValue = packageOption
    ? combination.find((condition) => condition.optionId === packageOption.id)?.value
    : undefined
  return packageValue ?? combination.map((condition) => condition.value).join(" · ")
}

function findEntryForCombination(pricing: PricingEntry[], combination: VariantCombination) {
  return pricing.find(
    (entry) => entry.appliesTo !== ALL_VARIANTS && combinationsMatch(entry.appliesTo, combination)
  )
}

/**
 * Shopee-style pricing matrix: one row per combination of every variation's values (Type ×
 * Package, etc.), with an inline-editable price per row — replaces adding pricing rows one at a
 * time once a product has variations. Regenerates rows whenever `options` changes, preserving
 * the id/price of any combination that already had an entry.
 */
export function VariantPricingTable({
  options,
  pricing,
  onChange,
}: {
  options: ProductOption[]
  pricing: PricingEntry[]
  onChange: (pricing: PricingEntry[]) => void
}) {
  // Cheap signature of exactly what determines the combination set, computed before the
  // (combinatorial, more expensive) cartesianOptionCombinations call -- lets both the useMemo
  // below and the reconcile effect key off a plain string instead of recomputing combinations
  // and JSON.stringify-ing the result on every render just to detect "did anything change".
  const optionsSignature = options.map((option) => `${option.id}:${option.values.join(",")}`).join("|")
  const combinations = useMemo(
    () => cartesianOptionCombinations(options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [optionsSignature]
  )
  const columns = options.filter((option) => option.values.length > 0)
  // "Set all" bulk price — fills every combination at once, handy when most share a price.
  const [bulkPrice, setBulkPrice] = useState("")

  useEffect(() => {
    const reconciled = combinations.map(
      (combination) =>
        findEntryForCombination(pricing, combination) ?? {
          id: generateId(),
          appliesTo: combination,
          pricingType: "Package" as const,
          packageName: packageNameFor(options, combination),
          price: 0,
          unit: "Package" as const,
        }
    )

    const unchanged =
      reconciled.length === pricing.length && reconciled.every((entry, index) => entry === pricing[index])
    if (!unchanged) onChange(reconciled)
    // Only re-reconcile when the set of combinations itself changes — not on every price edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsSignature])

  if (combinations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <LayersIcon className="size-4" />
        </span>
        <p className="text-sm font-medium">No combinations to price yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Add an option with values above — each combination shows up here to price.
        </p>
      </div>
    )
  }

  function applyBulkPrice() {
    const value = Number(bulkPrice)
    if (bulkPrice.trim() === "" || !Number.isFinite(value) || value < 0) return
    onChange(pricing.map((entry) => ({ ...entry, price: value })))
    setBulkPrice("")
  }

  const unpricedCount = pricing.filter((entry) => !(entry.price > 0)).length

  function updateEntry(id: string, changes: Partial<PricingEntry>) {
    onChange(pricing.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)))
  }

  function updatePricingType(id: string, pricingType: PricingType) {
    const unit: PricingUnit =
      pricingType === "Package" ? "Package" : pricingType === "Fixed" ? "piece" : "sq.ft."
    updateEntry(id, { pricingType, unit })
  }

  const headClass = "px-3 text-xs font-medium text-muted-foreground"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium">Prices</h4>
          <p className="text-xs text-muted-foreground">
            {combinations.length} {combinations.length === 1 ? "combination" : "combinations"}
            {unpricedCount > 0 && (
              <span className="text-order-status-gold"> · {unpricedCount} still at ₱0</span>
            )}
          </p>
        </div>
        {/* Bulk fill: most combinations often share a price — set it once, then adjust the few
            that differ. */}
        <div className="flex items-center gap-2">
          <CurrencyInput
            wrapperClassName="w-28"
            value={bulkPrice}
            onChange={(event) => setBulkPrice(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                applyBulkPrice()
              }
            }}
            aria-label="Price for all combinations"
            placeholder="Set all"
          />
          <Button type="button" variant="outline" size="sm" onClick={applyBulkPrice} disabled={bulkPrice.trim() === ""}>
            Apply to all
          </Button>
        </div>
      </div>

    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            {columns.map((option) => (
              <TableHead key={option.id} className={headClass}>
                {option.name || "Variant"}
              </TableHead>
            ))}
            <TableHead className={headClass}>Pricing type</TableHead>
            <TableHead className={headClass}>Unit</TableHead>
            <TableHead className={headClass}>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combinations.map((combination) => {
            const entry = findEntryForCombination(pricing, combination)
            if (!entry) return null
            return (
              <TableRow
                key={combination.map((condition) => condition.value).join("|")}
                // A still-₱0 combination gets a gold edge so it stands out; a hint only —
                // saving's validation is unchanged.
                className={cn(!(entry.price > 0) && "shadow-[inset_2px_0_0_var(--color-order-status-gold)]")}
              >
                {combination.map((condition, index) => (
                  <TableCell key={condition.optionId} className={cn("px-3", index === 0 && "font-medium")}>
                    {condition.value}
                  </TableCell>
                ))}
                <TableCell className="px-3">
                  <Select
                    value={entry.pricingType}
                    onValueChange={(value) => updatePricingType(entry.id, value as PricingType)}
                  >
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="px-3">
                  {entry.pricingType === "Per Unit" ? (
                    <Select
                      value={entry.unit}
                      onValueChange={(value) => updateEntry(entry.id, { unit: value as PricingUnit })}
                    >
                      <SelectTrigger size="sm" className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PER_UNIT_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">{entry.unit}</span>
                  )}
                </TableCell>
                <TableCell className="px-3">
                  <CurrencyInput
                    wrapperClassName="w-32"
                    value={entry.price}
                    onChange={(event) => updateEntry(entry.id, { price: Number(event.target.value) })}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
    </div>
  )
}
