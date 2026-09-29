import { FieldError } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"

import { PricingFields } from "../pricing-fields"
import { ProductOptionsFields } from "../product-options-fields"
import { SintraBoardCustomFields } from "../sintra-board-custom-fields"
import type { QuotationComponentProps } from "./types"
import { useLineItemHandlers } from "./use-line-item-handlers"

/** Standard board sizes via options, or a "Custom size" switch that swaps in the custom-size calculator. */
export function SintraQuotationComponent(props: QuotationComponentProps) {
  const { product, draft, computed, errors, idPrefix } = props
  const handlers = useLineItemHandlers(props)

  return (
    <>
      {!draft.isCustomSize && (
        <>
          <ProductOptionsFields
            product={product}
            values={draft.optionValues}
            onChange={handlers.handleOptionChange}
            excludeOptionIds={computed.packageOption ? [computed.packageOption.id] : undefined}
            idPrefix={idPrefix}
          />
          <FieldError>{errors.options}</FieldError>
        </>
      )}
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch
          checked={draft.isCustomSize}
          onCheckedChange={(checked) => handlers.handleCustomSizeToggle(!!checked)}
        />
        Custom size
      </label>
      {draft.isCustomSize ? (
        <SintraBoardCustomFields
          width={draft.customWidth}
          onWidthChange={handlers.handleCustomWidthChange}
          height={draft.customHeight}
          onHeightChange={handlers.handleCustomHeightChange}
          thickness={draft.customThickness}
          onThicknessChange={handlers.handleCustomThicknessChange}
          backToBack={draft.customBackToBack}
          onBackToBackChange={handlers.handleCustomBackToBackChange}
          quantity={draft.quantity}
          onQuantityChange={handlers.handleQuantityChange}
          idPrefix={idPrefix}
        />
      ) : (
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
          idPrefix={idPrefix}
        />
      )}
      <FieldError>{errors.pricing}</FieldError>
    </>
  )
}
