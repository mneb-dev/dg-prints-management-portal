import type { LineItemErrorKey } from "@/components/orders/order-line-item-card"
import type { LineItemComputed, LineItemDraft } from "@/lib/order-line-item"
import type { Product } from "@/lib/products"

/** Every category's quotation component takes the same props, so the line item card can render
 *  whichever one the product's category maps to without knowing which it is. */
export type QuotationComponentProps = {
  product: Product
  draft: LineItemDraft
  computed: LineItemComputed
  onChange: (next: LineItemDraft) => void
  onClearError: (key: LineItemErrorKey) => void
  errors: { options?: string; pricing?: string }
  idPrefix: string
}
