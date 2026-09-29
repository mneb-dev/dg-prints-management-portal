import { createElement, useEffect, useRef } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import type { LineItemComputed, LineItemDraft } from "@/lib/order-line-item"
import { resetDraftForProduct } from "@/lib/order-line-item"
import type { Product } from "@/lib/products"
import { useScrollIntoViewOnOpen } from "@/lib/use-scroll-into-view-on-open"
import { formatCurrency } from "@/lib/utils"

import { getQuotationComponent } from "./quotations"
import { StandardPricingFields } from "./quotations/standard-pricing-fields"

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

  function handleQuantityChange(value: string) {
    onChange({ ...draft, quantity: value })
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

          {/* The category quotation when custom quotation is on, otherwise plain options + pricing. */}
          {product &&
            !isMissingProduct &&
            !computed.isManual &&
            createElement(getQuotationComponent(product) ?? StandardPricingFields, {
              product,
              draft,
              computed,
              onChange,
              onClearError,
              errors,
              idPrefix,
            })}

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
