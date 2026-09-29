import { StandardPricingFields } from "./standard-pricing-fields"
import type { QuotationComponentProps } from "./types"

/** Options + width × height, always shown; computeLineItemPricing multiplies width × height × the
 *  product's sq.ft. rate. */
export function TarpaulinQuotationComponent(props: QuotationComponentProps) {
  return <StandardPricingFields {...props} alwaysShowDimensions />
}
