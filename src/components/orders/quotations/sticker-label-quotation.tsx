import type { StickerUnit } from "@/lib/sticker-quotation"

import { StickerQuotationFields } from "../sticker-quotation-fields"
import { StandardPricingFields } from "./standard-pricing-fields"
import type { QuotationComponentProps } from "./types"
import { useLineItemHandlers } from "./use-line-item-handlers"

export function StickerLabelQuotationComponent(props: QuotationComponentProps) {
  const { draft, computed, onChange } = props
  const handlers = useLineItemHandlers(props)

  return (
    <>
      <StandardPricingFields {...props} />
      <StickerQuotationFields
        width={draft.stickerWidth}
        onWidthChange={(value: string) => onChange({ ...draft, stickerWidth: value })}
        height={draft.stickerHeight}
        onHeightChange={(value: string) => onChange({ ...draft, stickerHeight: value })}
        unit={draft.stickerUnit}
        onUnitChange={(value: StickerUnit) => onChange({ ...draft, stickerUnit: value })}
        candidates={computed.packageCandidates}
        onSelectPackage={handlers.handleSelectPackageOption}
        selectedEntryId={computed.selectedPackageCandidateId}
        quantity={draft.quantity}
        onQuantityChange={handlers.handleQuantityChange}
      />
    </>
  )
}
