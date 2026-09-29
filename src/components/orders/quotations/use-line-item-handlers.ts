import type { LengthUnit } from "@/lib/length-units"
import { valueForOption } from "@/lib/pricing-resolver"
import { ALL_VARIANTS, type PricingEntry } from "@/lib/products"
import type { SintraThickness } from "@/lib/sintra-board-pricing"

import type { QuotationComponentProps } from "./types"

/** The line item card's field handlers, shared by the quotation components. */
export function useLineItemHandlers({
  draft,
  computed,
  onChange,
  onClearError,
}: Pick<QuotationComponentProps, "draft" | "computed" | "onChange" | "onClearError">) {
  function handleOptionChange(optionId: string, value: string) {
    onChange({ ...draft, optionValues: { ...draft.optionValues, [optionId]: value } })
    onClearError("options")
  }

  function handleCustomSizeToggle(value: boolean) {
    onChange({ ...draft, isCustomSize: value, optionValues: value ? {} : draft.optionValues })
    onClearError("pricing")
    onClearError("options")
  }

  function handleCustomWidthChange(value: string) {
    onChange({ ...draft, customWidth: value })
    onClearError("pricing")
  }

  function handleCustomHeightChange(value: string) {
    onChange({ ...draft, customHeight: value })
    onClearError("pricing")
  }

  function handleCustomThicknessChange(value: SintraThickness) {
    onChange({ ...draft, customThickness: value })
    onClearError("pricing")
  }

  function handleCustomBackToBackChange(value: boolean) {
    onChange({ ...draft, customBackToBack: value })
    onClearError("pricing")
  }

  function handleWidthChange(value: string) {
    onChange({ ...draft, width: value })
    onClearError("pricing")
  }

  function handleHeightChange(value: string) {
    onChange({ ...draft, height: value })
    onClearError("pricing")
  }

  function handlePackageEntryIdChange(value: string) {
    onChange({ ...draft, packageEntryId: value })
    onClearError("pricing")
  }

  function handleQuantityChange(value: string) {
    onChange({ ...draft, quantity: value })
    onClearError("pricing")
  }

  function handleDimensionUnitChange(value: LengthUnit) {
    onChange({ ...draft, dimensionUnit: value })
    onClearError("pricing")
  }

  // Selecting a quotation card for a card-selectable (Sticker / Laminated Sticker)
  // product writes into optionValues — the value resolvePricing()/buildOrderItem() actually
  // read — since these products drive pricing off a "Package" product option, not a
  // multi-candidate PricingEntry list.
  function handleSelectPackageOption(entryId: string) {
    const entry: PricingEntry | undefined = computed.packageCandidates.find((candidate) => candidate.id === entryId)
    if (!entry || !computed.packageOption) return
    const value =
      valueForOption(entry.appliesTo, computed.packageOption.id) ?? computed.packageOption.values[0] ?? ALL_VARIANTS
    onChange({ ...draft, optionValues: { ...draft.optionValues, [computed.packageOption.id]: value } })
    onClearError("options")
    onClearError("pricing")
  }

  return {
    handleOptionChange,
    handleCustomSizeToggle,
    handleCustomWidthChange,
    handleCustomHeightChange,
    handleCustomThicknessChange,
    handleCustomBackToBackChange,
    handleWidthChange,
    handleHeightChange,
    handlePackageEntryIdChange,
    handleQuantityChange,
    handleDimensionUnitChange,
    handleSelectPackageOption,
  }
}
