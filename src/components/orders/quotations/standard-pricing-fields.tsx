import { FieldError } from "@/components/ui/field"

import { PricingFields } from "../pricing-fields"
import { ProductOptionsFields } from "../product-options-fields"
import type { QuotationComponentProps } from "./types"
import { useLineItemHandlers } from "./use-line-item-handlers"

/** Product options + pricing fields — what every non-manual line item shows, and all a product
 *  without custom quotation gets. */
export function StandardPricingFields(props: QuotationComponentProps & { alwaysShowDimensions?: boolean }) {
  const { product, draft, computed, errors, idPrefix, alwaysShowDimensions } = props
  const handlers = useLineItemHandlers(props)

  return (
    <>
      <ProductOptionsFields
        product={product}
        values={draft.optionValues}
        onChange={handlers.handleOptionChange}
        excludeOptionIds={computed.packageOption ? [computed.packageOption.id] : undefined}
        idPrefix={idPrefix}
      />
      <FieldError>{errors.options}</FieldError>
      <PricingFields
        resolution={computed.resolution}
        packageEntryId={draft.packageEntryId}
        onPackageEntryIdChange={handlers.handlePackageEntryIdChange}
        width={draft.width}
        onWidthChange={handlers.handleWidthChange}
        height={draft.height}
        onHeightChange={handlers.handleHeightChange}
        dimensionUnit={draft.dimensionUnit}
        onDimensionUnitChange={handlers.handleDimensionUnitChange}
        quantity={draft.quantity}
        onQuantityChange={handlers.handleQuantityChange}
        hidePackageSelector={computed.isCardSelectablePackage}
        hideQuantity={computed.isCardSelectablePackage}
        alwaysShowDimensions={alwaysShowDimensions}
        idPrefix={idPrefix}
      />
      <FieldError>{errors.pricing}</FieldError>
    </>
  )
}
