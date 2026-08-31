import type { OrderItem } from "@/lib/orders-slice"
import { ALL_VARIANTS, type PricingEntry, type Product, type ProductCategory } from "@/lib/products"

/** Categories whose package tiers are picked via clickable quotation cards instead of a dropdown. */
export const CARD_SELECTABLE_PACKAGE_CATEGORIES: ProductCategory[] = ["Sticker Label", "Laminated Sticker"]

export type PricingResolution =
  | { kind: "package"; candidates: PricingEntry[] }
  | { kind: "auto"; entry: PricingEntry }
  | { kind: "none" }

function candidateEntries(product: Product, selectedValues: Record<string, string>): PricingEntry[] {
  const selectedValueSet = new Set(Object.values(selectedValues))
  return product.pricing.filter(
    (entry) => entry.appliesTo === ALL_VARIANTS || selectedValueSet.has(entry.appliesTo)
  )
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
