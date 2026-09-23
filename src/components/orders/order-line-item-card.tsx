import { useEffect, useRef } from "react"
import { ChevronDownIcon, FlameIcon, InfoIcon, PackageIcon, Trash2Icon } from "lucide-react"

import { CharCount } from "@/components/char-count"
import { Badge } from "@/components/ui/badge"
import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { QuantityInput } from "@/components/ui/quantity-input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { LengthUnit } from "@/lib/length-units"
import type { LineItemComputed, LineItemDraft } from "@/lib/order-line-item"
import { resetDraftForProduct } from "@/lib/order-line-item"
import { valueForOption } from "@/lib/pricing-resolver"
import { ALL_VARIANTS, type PricingEntry, type Product } from "@/lib/products"
import type { SintraThickness } from "@/lib/sintra-board-pricing"
import type { StickerUnit } from "@/lib/sticker-quotation"
import { useScrollIntoViewOnOpen } from "@/lib/use-scroll-into-view-on-open"
import { formatCurrency } from "@/lib/utils"

import { LaminatedStickerQuotationFields } from "./laminated-sticker-quotation-fields"
import { PricingFields } from "./pricing-fields"
import { ProductOptionsFields } from "./product-options-fields"
import { SintraBoardCustomFields } from "./sintra-board-custom-fields"
import { StickerQuotationFields } from "./sticker-quotation-fields"

export type LineItemErrorKey = "product" | "options" | "pricing" | "notes"

// One short descriptive line for the collapsed summary row — the first thing that actually
// distinguishes this item (a chosen option, a package, or a size), not an exhaustive recap.
function summaryDetail(product: Product, draft: LineItemDraft, computed: LineItemComputed): string | null {
  if (computed.isManual) return draft.manualProductName || null

  // A regular option ("Type: Glossy") says more than the raw package value ("1"), so it wins
  // when both are set; the package value is only shown when it's the sole selectable option.
  const selectedOption = product.options.find(
    (option) => option.id !== computed.packageOption?.id && draft.optionValues[option.id]
  )
  if (selectedOption) return `${selectedOption.name}: ${draft.optionValues[selectedOption.id]}`

  if (computed.packageOption) {
    const value = draft.optionValues[computed.packageOption.id]
    if (value) return value
  }

  if (draft.width && draft.height) return `${draft.width} × ${draft.height} ${draft.dimensionUnit}`
  if (draft.stickerWidth && draft.stickerHeight) {
    return `${draft.stickerWidth} × ${draft.stickerHeight} ${draft.stickerUnit}`
  }

  return null
}

export function OrderLineItemCard({
  id,
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
  isOpen,
  onOpenChange,
  canCollapse,
}: {
  id?: string
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
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  canCollapse: boolean
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

  // Selecting a quotation card for a card-selectable (Sticker / Laminated Sticker)
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

  const detail = product && !isMissingProduct ? summaryDetail(product, draft, computed) : null

  // Expanding a collapsed item scrolls it into view once the open animation settles, so the
  // newly revealed fields aren't left below the fold.
  const cardRef = useRef<HTMLDivElement>(null)
  useScrollIntoViewOnOpen(cardRef, canCollapse && isOpen ? "open" : null)

  return (
    // scroll-mt clears the sticky app header; scroll-mb leaves room below when an expand scrolls
    // the card into view.
    <Card ref={cardRef} id={id} className="scroll-mt-24 scroll-mb-6">
      <Collapsible open={canCollapse ? isOpen : true} onOpenChange={onOpenChange}>
        <CardHeader>
          {canCollapse ? (
            // The whole header row is the toggle: a soft wash on hover, and the chevron sits in a
            // round chip that tints and flips as the panel opens.
            <CollapsibleTrigger className="group/toggle -mx-2 -my-1 flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left outline-none transition-colors duration-200 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50">
              <OrderFormSectionHeader
                icon={PackageIcon}
                title={itemLabel}
                description={
                  // Keyed so the swap between the hint and the collapsed summary eases in instead
                  // of snapping.
                  <span
                    key={isOpen ? "open" : "closed"}
                    className="flex min-w-0 animate-in items-center gap-2 duration-300 fade-in-0 slide-in-from-left-1 motion-reduce:animate-none"
                  >
                    {isOpen ? (
                      "Product, options and quantity"
                    ) : (
                      <>
                        {detail && <Badge variant="secondary">{detail}</Badge>}
                        <span className="truncate">Qty {draft.quantity}</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {formatCurrency(computed.lineTotal)}
                        </span>
                      </>
                    )}
                  </span>
                }
              />
              <span
                aria-hidden
                className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-[background-color,color,rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/toggle:bg-accent group-hover/toggle:text-accent-foreground group-data-[panel-open]/toggle:rotate-180 motion-reduce:transition-colors"
              >
                <ChevronDownIcon className="size-4" />
              </span>
            </CollapsibleTrigger>
          ) : (
            <OrderFormSectionHeader
              icon={PackageIcon}
              title={index === 0 ? "Item 1" : itemLabel}
              description="Product, options and quantity"
            />
          )}
          {index > 0 && onRemove && (
            <CardAction>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRemove}
                aria-label={`Remove ${itemLabel}`}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2Icon />
              </Button>
            </CardAction>
          )}
        </CardHeader>
        {/* Height eases between 0 and Base UI's measured --collapsible-panel-height, while the
            content fades and settles into place a beat behind it. */}
        <CollapsibleContent className="group/panel h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
      <CardContent className="pt-4 transition-[opacity,translate] duration-300 ease-out group-data-[ending-style]/panel:-translate-y-2 group-data-[ending-style]/panel:opacity-0 group-data-[starting-style]/panel:-translate-y-2 group-data-[starting-style]/panel:opacity-0 motion-reduce:transition-none">
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
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate">{candidate?.name}</span>
                          {hotProductIds.has(id) && (
                            <Badge variant="secondary" className="h-4 gap-0.5 px-1.5 text-[10px]">
                              <FlameIcon aria-hidden className="size-2.5! text-order-status-tangerine" />
                              Hot
                            </Badge>
                          )}
                          {candidate?.category && (
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{candidate.category}</span>
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
            <p className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
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
                  <QuantityInput
                    id={`${idPrefix}order-quantity`}
                    value={draft.quantity}
                    onChange={handleQuantityChange}
                  />
                </Field>
                <Field data-invalid={!!errors.pricing}>
                  <FieldLabel htmlFor={`${idPrefix}order-manual-price`}>Price</FieldLabel>
                  <CurrencyInput
                    id={`${idPrefix}order-manual-price`}
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
              {!(product.category === "Sintra" && draft.isCustomSize) && (
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
              {product.category === "Sintra" && (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={draft.isCustomSize}
                    onCheckedChange={(checked) => handleCustomSizeToggle(!!checked)}
                  />
                  Custom size
                </label>
              )}
              {product.category === "Sintra" && draft.isCustomSize ? (
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

          {product && !isMissingProduct && product.category === "Sticker" && (
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
              <div className="flex items-baseline justify-between gap-2">
                <FieldLabel htmlFor={`${idPrefix}order-notes`}>Notes</FieldLabel>
                <CharCount value={draft.notes} max={60} />
              </div>
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

          {/* Line total, always visible while the item is open (the collapsed header shows it too). */}
          {product && !isMissingProduct && (
            <div className="-mb-1 flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Line total</span>
              <span className="text-base font-semibold tabular-nums">{formatCurrency(computed.lineTotal)}</span>
            </div>
          )}
        </FieldGroup>
      </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
