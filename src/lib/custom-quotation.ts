import type { Product } from "@/lib/products"

/** Categories that have a dedicated quotation calculator. A product opts in with its
 *  `customQuotation` flag; the order form then renders the calculator mapped to its category
 *  (see components/orders/quotations); with it off, the item gets plain options + pricing. */
export const CUSTOM_QUOTATION_KEYS = ["Sticker Label", "Laminated Sticker", "Tarpaulin", "Sintra"] as const
export type CustomQuotationKey = (typeof CUSTOM_QUOTATION_KEYS)[number]

/** Category names have drifted across environments ("Sticker" / "Sintra" vs. the originally
 *  seeded "Sticker Label" / "Sintra Board"), so matching is case-insensitive with both forms. */
const CATEGORY_ALIASES: Record<string, CustomQuotationKey> = {
  sticker: "Sticker Label",
  "sintra board": "Sintra",
  ...Object.fromEntries(CUSTOM_QUOTATION_KEYS.map((key) => [key.toLowerCase(), key])),
}

export function customQuotationKeyForCategory(category: string | null | undefined): CustomQuotationKey | null {
  return category ? (CATEGORY_ALIASES[category.trim().toLowerCase()] ?? null) : null
}

/** The calculator a product is quoted with — null unless the product has custom quotation
 *  turned on and its category has a calculator. */
export function customQuotationKeyFor(product: Product | null): CustomQuotationKey | null {
  return product?.customQuotation ? customQuotationKeyForCategory(product.category) : null
}
