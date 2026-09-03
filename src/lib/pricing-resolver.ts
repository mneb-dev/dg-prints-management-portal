import type { OrderItem } from "@/lib/orders-slice"
import {
  ALL_VARIANTS,
  type AppliesTo,
  type PricingEntry,
  type Product,
  type ProductCategory,
} from "@/lib/products"

/** Categories whose package tiers are picked via clickable quotation cards instead of a dropdown. */
export const CARD_SELECTABLE_PACKAGE_CATEGORIES: ProductCategory[] = ["Sticker Label", "Laminated Sticker"]

/** True for an option name that identifies the package-tier option for card-selectable categories
 *  (Sticker Label / Laminated Sticker) — tolerant of "Package" vs "Packages", since pluralizing it is
 *  an easy, natural thing for an admin to type and previously broke package-tier detection silently. */
export function isPackageOptionName(name: string): boolean {
  return /^packages?$/.test(name.trim().toLowerCase())
}

export type PricingResolution =
  | { kind: "package"; candidates: PricingEntry[] }
  | { kind: "auto"; entry: PricingEntry }
  | { kind: "none" }

/** True when every condition in `appliesTo` is satisfied by the customer's selected option
 *  values — the combination match described in the product's pricing matrix. `"All"` always
 *  matches, regardless of what's selected. */
function matchesSelection(appliesTo: AppliesTo, selectedValues: Record<string, string>): boolean {
  if (appliesTo === ALL_VARIANTS) return true
  if (!Array.isArray(appliesTo)) return false
  return appliesTo.every((condition) => selectedValues[condition.optionId] === condition.value)
}

/** The value a pricing entry's combination pins for a given option, if any — e.g. the Package
 *  value on an entry keyed by Type + Package. Returns undefined for `"All"` or when the entry
 *  has no condition on that option. */
export function valueForOption(appliesTo: AppliesTo, optionId: string): string | undefined {
  if (appliesTo === ALL_VARIANTS || !Array.isArray(appliesTo)) return undefined
  return appliesTo.find((condition) => condition.optionId === optionId)?.value
}

/** Human-readable fallback label for an entry with no explicit packageName. */
export function describeAppliesTo(appliesTo: AppliesTo): string {
  if (appliesTo === ALL_VARIANTS) return ALL_VARIANTS
  if (!Array.isArray(appliesTo)) return String(appliesTo)
  return appliesTo.map((condition) => condition.value).join(" · ")
}

function candidateEntries(product: Product, selectedValues: Record<string, string>): PricingEntry[] {
  return product.pricing.filter((entry) => matchesSelection(entry.appliesTo, selectedValues))
}

export function resolvePricing(product: Product, selectedValues: Record<string, string>): PricingResolution {
  const candidates = candidateEntries(product, selectedValues)
  if (candidates.length === 0) return { kind: "none" }

  const types = new Set(candidates.map((entry) => entry.pricingType))
  if (candidates.length > 1 && types.size === 1 && [...types][0] === "Package") {
    return { kind: "package", candidates }
  }

  const specific = candidates.find((entry) => entry.appliesTo !== ALL_VARIANTS)
  return { kind: "auto", entry: specific ?? candidates[0] }
}

/**
 * Same as `resolvePricing`, but when nothing matches yet (a required option, e.g. Tarpaulin's
 * Type, hasn't been picked), falls back to previewing the cheapest `Per Unit` / `sq.ft.` entry
 * that doesn't conflict with whatever *is* already selected — lets an area-based quote show
 * before every option is chosen. Once a conflicting option is actually picked, the real
 * `resolvePricing` match takes over. No-ops (returns the normal resolution) for products with
 * no qualifying sq.ft. entries, so it's a safe drop-in everywhere `resolvePricing` is used for
 * on-screen quoting.
 */
export function resolvePricingPreview(product: Product, selectedValues: Record<string, string>): PricingResolution {
  const resolution = resolvePricing(product, selectedValues)
  if (resolution.kind !== "none") return resolution

  const sqftEntries = product.pricing.filter(
    (entry) =>
      entry.pricingType === "Per Unit" &&
      entry.unit === "sq.ft." &&
      Array.isArray(entry.appliesTo) &&
      entry.appliesTo.every((condition) => {
        const selected = selectedValues[condition.optionId]
        return selected === undefined || selected === condition.value
      })
  )
  if (sqftEntries.length === 0) return resolution

  const cheapest = sqftEntries.reduce((min, entry) => (entry.price < min.price ? entry : min))
  return { kind: "auto", entry: cheapest }
}

/**
 * Package-tier candidates for a card-selectable product (Sticker Label / Laminated Sticker)
 * whose Package value hasn't been picked yet — matches every *other* selected option (e.g.
 * Type) but ignores whatever is currently in `selectedValues[packageOptionId]`, since that's
 * exactly the value the customer is about to choose from these candidates.
 */
export function packageCandidatesForSelection(
  product: Product,
  packageOptionId: string,
  selectedValues: Record<string, string>
): PricingEntry[] {
  const selectedWithoutPackage = Object.fromEntries(
    Object.entries(selectedValues).filter(([optionId]) => optionId !== packageOptionId)
  )
  return product.pricing.filter((entry) => {
    if (entry.pricingType !== "Package") return false
    if (entry.appliesTo === ALL_VARIANTS) return true
    if (!Array.isArray(entry.appliesTo)) return false
    const conditionsExceptPackage = entry.appliesTo.filter((condition) => condition.optionId !== packageOptionId)
    return conditionsExceptPackage.every(
      (condition) => selectedWithoutPackage[condition.optionId] === condition.value
    )
  })
}

/** One representative pricing entry per distinct value of the package option, regardless of any other
 *  option's selection — lets package-tier cards be browsed as a preview before other required options
 *  (e.g. a "Type" variant) are chosen. Once every other option is selected, prefer
 *  packageCandidatesForSelection instead so the shown price reflects that exact combination. */
export function previewPackageCandidates(product: Product, packageOptionId: string): PricingEntry[] {
  const packageOption = product.options.find((option) => option.id === packageOptionId)
  if (!packageOption) return []
  const candidates: PricingEntry[] = []
  for (const value of packageOption.values) {
    const entry = product.pricing.find(
      (candidate) =>
        candidate.pricingType === "Package" &&
        (candidate.appliesTo === ALL_VARIANTS || valueForOption(candidate.appliesTo, packageOptionId) === value)
    )
    if (entry) candidates.push(entry)
  }
  return candidates
}

export function showsDimensionInputs(resolution: PricingResolution): boolean {
  return resolution.kind === "auto" && resolution.entry.unit === "sq.ft."
}

export function computeLineTotal(item: Pick<OrderItem, "pricing" | "quantity">): number {
  const { pricing, quantity } = item
  switch (pricing.pricingType) {
    case "Package":
      return pricing.unitPrice * quantity
    case "Per Unit":
      return pricing.width && pricing.height
        ? pricing.width * pricing.height * pricing.unitPrice * quantity
        : pricing.unitPrice * quantity
    case "Fixed":
      return pricing.unitPrice * quantity
    case "Manual":
      return pricing.unitPrice * quantity
    case "Custom":
      return pricing.unitPrice * quantity
  }
}

export function isManualPricingProduct(product: Product): boolean {
  return product.pricing.length === 0
}
