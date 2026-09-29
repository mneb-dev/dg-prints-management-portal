import type { ComponentType } from "react"

import { customQuotationKeyFor, type CustomQuotationKey } from "@/lib/custom-quotation"
import type { Product } from "@/lib/products"

import { LaminatedStickerQuotationComponent } from "./laminated-sticker-quotation"
import { SintraQuotationComponent } from "./sintra-quotation"
import { StickerLabelQuotationComponent } from "./sticker-label-quotation"
import { TarpaulinQuotationComponent } from "./tarpaulin-quotation"
import type { QuotationComponentProps } from "./types"

export type { QuotationComponentProps } from "./types"

/** Category → quotation component. Keys match category names via customQuotationKeyForCategory. */
export const QUOTATION_COMPONENTS: { key: CustomQuotationKey; component: ComponentType<QuotationComponentProps> }[] = [
  { key: "Sticker Label", component: StickerLabelQuotationComponent },
  { key: "Laminated Sticker", component: LaminatedStickerQuotationComponent },
  { key: "Tarpaulin", component: TarpaulinQuotationComponent },
  { key: "Sintra", component: SintraQuotationComponent },
]

/** The quotation component for a product, or null when custom quotation is off or its category
 *  has no component (the line item then shows the generic options/pricing fields). */
export function getQuotationComponent(product: Product | null): ComponentType<QuotationComponentProps> | null {
  const key = customQuotationKeyFor(product)
  return key ? (QUOTATION_COMPONENTS.find((entry) => entry.key === key)?.component ?? null) : null
}
