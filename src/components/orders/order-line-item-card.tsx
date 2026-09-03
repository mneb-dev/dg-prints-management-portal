import { useEffect } from "react"
import { Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Combobox,
  ComboboxEmpty,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxPopup,
  ComboboxPrimitive,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { LengthUnit } from "@/lib/length-units"
import type { LineItemComputed, LineItemDraft } from "@/lib/order-line-item"
import { resetDraftForProduct } from "@/lib/order-line-item"
import { valueForOption } from "@/lib/pricing-resolver"
import { ALL_VARIANTS, type PricingEntry, type Product } from "@/lib/products"
import type { SintraThickness } from "@/lib/sintra-board-pricing"
import type { StickerUnit } from "@/lib/sticker-quotation"

import { LaminatedStickerQuotationFields } from "./laminated-sticker-quotation-fields"
import { PricingFields } from "./pricing-fields"
import { ProductOptionsFields } from "./product-options-fields"
import { SintraBoardCustomFields } from "./sintra-board-custom-fields"
import { StickerQuotationFields } from "./sticker-quotation-fields"

export type LineItemErrorKey = "product" | "options" | "pricing" | "notes"

export function OrderLineItemCard({
  index,
  products,
  activeProducts,
  hotProductIds,
  product,
  draft,
  computed,
  onChange,
  onRemove,
  isMissingProduct,
  errors,
  onClearError,
}: {
  index: number
  products: Product[]
  activeProducts: Product[]
  hotProductIds: Set<string>
  product: Product | null
  draft: LineItemDraft
  computed: LineItemComputed
  onChange: (next: LineItemDraft) => void
  onRemove?: () => void
  isMissingProduct: boolean
  errors: { product?: string; options?: string; pricing?: string; notes?: string }
  onClearError: (key: LineItemErrorKey) => void
}) {
  const idPrefix = `item-${index}-`
  const itemLabel = product?.name ?? `Item ${index + 1}`

  // A package option with a single possible value has nothing to click — auto-select it so
  // the required-option validation is satisfied without a dropdown or a no-op click target.
  useEffect(() => {
    if (!computed.packageOption || computed.packageOption.values.length !== 1) return
    const onlyValue = computed.packageOption.values[0]
    if (draft.optionValues[computed.packageOption.id] === onlyValue) return
    onChange({ ...draft, optionValues: { ...draft.optionValues, [computed.packageOption.id]: onlyValue } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed.packageOption?.id, computed.packageOption?.values.length])

  function handleProductChange(id: string) {
    onChange(resetDraftForProduct(draft, id))
    onClearError("product")
    onClearError("options")
    onClearError("pricing")
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

  // Selecting a quotation card for a card-selectable (Sticker Label / Laminated Sticker)
  // product writes into optionValues — the value resolvePricing()/buildOrderItem() actually
  // read — since these products drive pricing off a "Package" product option, not a
  // multi-candidate PricingEntry list.
  function handleSelectPackageOption(entry: PricingEntry) {
    if (!computed.packageOption) return
    const value =
      valueForOption(entry.appliesTo, computed.packageOption.id) ?? computed.packageOption.values[0] ?? ALL_VARIANTS
    onChange({ ...draft, optionValues: { ...draft.optionValues, [computed.packageOption.id]: value } })
    onClearError("options")
    onClearError("pricing")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{index === 0 ? "Product" : itemLabel}</CardTitle>
        {index > 0 && onRemove && (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              aria-label={`Remove ${itemLabel}`}
            >
              <Trash2Icon />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-invalid={!!errors.product}>
            <FieldLabel htmlFor={`${idPrefix}order-product`}>Product</FieldLabel>
            <Combobox
              items={activeProducts.map((candidate) => candidate.id)}
              value={draft.productId || null}
              onValueChange={(id) => handleProductChange((id as string | null) ?? "")}
              itemToStringLabel={(id: string) => products.find((candidate) => candidate.id === id)?.name ?? ""}
            >
              <ComboboxInputGroup>
                <ComboboxInput
                  id={`${idPrefix}order-product`}
                  className="w-full"
                  aria-invalid={!!errors.product}
                  placeholder="Select a product"
                />
                <ComboboxIcon />
              </ComboboxInputGroup>
              <ComboboxPopup>
                <ComboboxEmpty>No products found.</ComboboxEmpty>
                <ComboboxPrimitive.List>
                  {(id: string) => {
                    const candidate = activeProducts.find((item) => item.id === id)
                    return (
                      <ComboboxItem key={id} value={id}>
                        <span className="flex flex-1 items-center gap-1.5">
                          {candidate?.name}
                          {hotProductIds.has(id) && (
                            <Badge variant="warning" className="h-4 px-1.5 text-[10px]">
                              Hot
                            </Badge>
                          )}
                        </span>
                      </ComboboxItem>
                    )
                  }}
                </ComboboxPrimitive.List>
              </ComboboxPopup>
            </Combobox>
            <FieldError>{errors.product}</FieldError>
          </Field>

          {isMissingProduct && (
            <p className="text-sm text-muted-foreground">
              This item's product is no longer in the catalog, so pricing can't be recalculated.
            </p>
          )}

          {product && !isMissingProduct && computed.isManual && (
            <>
              <Field data-invalid={!!errors.pricing}>
                <FieldLabel htmlFor={`${idPrefix}order-manual-name`}>Product Name</FieldLabel>
                <Input
                  id={`${idPrefix}order-manual-name`}
                  value={draft.manualProductName}
                  onChange={(event) => {
                    onChange({ ...draft, manualProductName: event.target.value })
                    onClearError("pricing")
                  }}
                  placeholder="Customized Mug"
                  aria-invalid={!!errors.pricing}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor={`${idPrefix}order-quantity`}>Quantity</FieldLabel>
                  <Input
                    id={`${idPrefix}order-quantity`}
                    type="number"
                    min={1}
                    step="1"
                    value={draft.quantity}
                    onChange={(event) => handleQuantityChange(event.target.value)}
                  />
                </Field>
                <Field data-invalid={!!errors.pricing}>
                  <FieldLabel htmlFor={`${idPrefix}order-manual-price`}>Price</FieldLabel>
                  <Input
                    id={`${idPrefix}order-manual-price`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.manualUnitPrice}
                    onChange={(event) => {
                      onChange({ ...draft, manualUnitPrice: event.target.value })
                      onClearError("pricing")
                    }}
                    aria-invalid={!!errors.pricing}
                  />
                </Field>
              </div>
              <FieldError>{errors.pricing}</FieldError>
            </>
          )}

          {product && !isMissingProduct && !computed.isManual && (
            <>
              {!(product.category === "Sintra Board" && draft.isCustomSize) && (
                <>
                  <ProductOptionsFields
                    product={product}
                    values={draft.optionValues}
                    onChange={(optionId, value) => {
                      onChange({ ...draft, optionValues: { ...draft.optionValues, [optionId]: value } })
                      onClearError("options")
                    }}
                    excludeOptionIds={computed.packageOption ? [computed.packageOption.id] : undefined}
                    idPrefix={idPrefix}
                  />
                  <FieldError>{errors.options}</FieldError>
                </>
              )}
              {product.category === "Sintra Board" && (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={draft.isCustomSize}
                    onCheckedChange={(checked) => handleCustomSizeToggle(!!checked)}
                  />
                  Custom size
                </label>
              )}
              {product.category === "Sintra Board" && draft.isCustomSize ? (
                <SintraBoardCustomFields
                  width={draft.customWidth}
                  onWidthChange={handleCustomWidthChange}
                  height={draft.customHeight}
                  onHeightChange={handleCustomHeightChange}
                  thickness={draft.customThickness}
                  onThicknessChange={handleCustomThicknessChange}
                  backToBack={draft.customBackToBack}
                  onBackToBackChange={handleCustomBackToBackChange}
                  quantity={draft.quantity}
                  onQuantityChange={handleQuantityChange}
                  idPrefix={idPrefix}
                />
              ) : (
                <PricingFields
                  resolution={computed.resolution}
                  packageEntryId={draft.packageEntryId}
                  onPackageEntryIdChange={handlePackageEntryIdChange}
                  width={draft.width}
                  onWidthChange={handleWidthChange}
                  height={draft.height}
                  onHeightChange={handleHeightChange}
                  dimensionUnit={draft.dimensionUnit}
                  onDimensionUnitChange={handleDimensionUnitChange}
                  quantity={draft.quantity}
                  onQuantityChange={handleQuantityChange}
                  hidePackageSelector={computed.isCardSelectablePackage}
                  hideQuantity={computed.isCardSelectablePackage}
                  idPrefix={idPrefix}
                />
              )}
              <FieldError>{errors.pricing}</FieldError>
            </>
          )}

          {product && !isMissingProduct && product.category === "Sticker Label" && (
            <StickerQuotationFields
              width={draft.stickerWidth}
              onWidthChange={(value: string) => onChange({ ...draft, stickerWidth: value })}
              height={draft.stickerHeight}
              onHeightChange={(value: string) => onChange({ ...draft, stickerHeight: value })}
              unit={draft.stickerUnit}
              onUnitChange={(value: StickerUnit) => onChange({ ...draft, stickerUnit: value })}
              candidates={computed.packageCandidates}
              onSelectPackage={(entryId) => {
                const entry = computed.packageCandidates.find((candidate) => candidate.id === entryId)
                if (entry) handleSelectPackageOption(entry)
              }}
              selectedEntryId={computed.selectedPackageCandidateId}
              quantity={draft.quantity}
              onQuantityChange={handleQuantityChange}
            />
          )}

          {product && !isMissingProduct && computed.isLaminatedSticker && (
            <LaminatedStickerQuotationFields
              width={draft.stickerWidth}
              onWidthChange={(value: string) => onChange({ ...draft, stickerWidth: value })}
              height={draft.stickerHeight}
              onHeightChange={(value: string) => onChange({ ...draft, stickerHeight: value })}
              unit={draft.stickerUnit}
              onUnitChange={(value: StickerUnit) => onChange({ ...draft, stickerUnit: value })}
              candidates={computed.packageCandidates}
              selectedEntryId={computed.selectedPackageCandidateId}
              onSelectPackage={(entryId) => {
                const entry = computed.packageCandidates.find((candidate) => candidate.id === entryId)
                if (entry) handleSelectPackageOption(entry)
              }}
              showAmount
              quantity={draft.quantity}
              onQuantityChange={handleQuantityChange}
            />
          )}

          {product && !isMissingProduct && (
            <Field data-invalid={!!errors.notes}>
              <FieldLabel htmlFor={`${idPrefix}order-notes`}>Notes</FieldLabel>
              <Textarea
                id={`${idPrefix}order-notes`}
                value={draft.notes}
                onChange={(event) => {
                  onChange({ ...draft, notes: event.target.value })
                  onClearError("notes")
                }}
                placeholder="Please use the uploaded design."
                maxLength={60}
                aria-invalid={!!errors.notes}
              />
              <FieldError>{errors.notes}</FieldError>
            </Field>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
