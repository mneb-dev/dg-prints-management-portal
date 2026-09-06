import { useEffect } from "react"

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
import { generateId } from "@/lib/utils"
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
  const combinations = cartesianOptionCombinations(options)
  const columns = options.filter((option) => option.values.length > 0)

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
  }, [JSON.stringify(combinations)])

  if (combinations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least one variation with values above to generate pricing.
      </p>
    )
  }

  function updateEntry(id: string, changes: Partial<PricingEntry>) {
    onChange(pricing.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)))
  }

  function updatePricingType(id: string, pricingType: PricingType) {
    const unit: PricingUnit =
      pricingType === "Package" ? "Package" : pricingType === "Fixed" ? "piece" : "sq.ft."
    updateEntry(id, { pricingType, unit })
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((option) => (
              <TableHead key={option.id}>{option.name || "Variant"}</TableHead>
            ))}
            <TableHead>Pricing Type</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combinations.map((combination) => {
            const entry = findEntryForCombination(pricing, combination)
            if (!entry) return null
            return (
              <TableRow key={combination.map((condition) => condition.value).join("|")}>
                {combination.map((condition) => (
                  <TableCell key={condition.optionId}>{condition.value}</TableCell>
                ))}
                <TableCell>
                  <Select
                    value={entry.pricingType}
                    onValueChange={(value) => updatePricingType(entry.id, value as PricingType)}
                  >
                    <SelectTrigger className="w-32">
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
                <TableCell>
                  {entry.pricingType === "Per Unit" ? (
                    <Select
                      value={entry.unit}
                      onValueChange={(value) => updateEntry(entry.id, { unit: value as PricingUnit })}
                    >
                      <SelectTrigger className="w-24">
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
                <TableCell>
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
  )
}
