import { useEffect } from "react"

import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isPackageOptionName } from "@/lib/pricing-resolver"
import type { PricingEntry, ProductOption } from "@/lib/products"
import { ALL_VARIANTS } from "@/lib/products"
import { generateId } from "@/lib/utils"
import { cartesianOptionCombinations, combinationsMatch, type VariantCombination } from "@/lib/variant-matrix"

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

  function updatePrice(id: string, price: number) {
    onChange(pricing.map((entry) => (entry.id === id ? { ...entry, price } : entry)))
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((option) => (
              <TableHead key={option.id}>{option.name || "Variant"}</TableHead>
            ))}
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
                  <div className="relative w-32">
                    <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                      ₱
                    </span>
                    <Input
                      className="pl-6"
                      type="number"
                      min={0}
                      step="0.01"
                      value={entry.price}
                      onChange={(event) => updatePrice(entry.id, Number(event.target.value))}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
