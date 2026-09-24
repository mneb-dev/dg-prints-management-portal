import { useEffect, useState, type ReactNode } from "react"
import {
  CopyIcon,
  InfoIcon,
  PackageSearchIcon,
  PlusIcon,
  RotateCcwIcon,
  TruckIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { ChoiceCard } from "@/components/choice-card"
import { FormSection } from "@/components/form-section"
import { LaminatedStickerQuotationFields } from "@/components/orders/laminated-sticker-quotation-fields"
import { type OrderFormSeed } from "@/components/orders/order-form"
import { ProductOptionsFields } from "@/components/orders/product-options-fields"
import { QuickSizeChips } from "@/components/orders/quick-size-chips"
import { SintraBoardCustomFields } from "@/components/orders/sintra-board-custom-fields"
import { StickerQuotationFields } from "@/components/orders/sticker-quotation-fields"
import { PageHeader } from "@/components/page-header"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { useAuth } from "@/lib/auth"
import { useCategories, type CommonSize } from "@/lib/categories"
import { copyToClipboard } from "@/lib/clipboard"
import { calculateLaminatedStickerQuotation } from "@/lib/laminated-sticker-quotation"
import { convertToFeet, LENGTH_UNITS, type LengthUnit } from "@/lib/length-units"
import { isPackageOptionName, previewPackageCandidates, resolvePricingPreview } from "@/lib/pricing-resolver"
import { useProductCatalog, type Product, type ProductCategory } from "@/lib/products"
import { appendShippingFeeNote } from "@/lib/quote-text"
import { useSettings } from "@/lib/settings"
import { calculateSintraCustomPrice, type SintraThickness } from "@/lib/sintra-board-pricing"
import { calculateStickerPackageResult, parsePackageNumber, type StickerUnit } from "@/lib/sticker-quotation"
import { cn, formatCurrency } from "@/lib/utils"

const CATEGORIES: { category: ProductCategory; label: string; hint: string }[] = [
  { category: "Sticker", label: "Sticker", hint: "Packages by size" },
  { category: "Tarpaulin", label: "Tarpaulin", hint: "Priced per sq.ft." },
  { category: "Sintra", label: "Sintra", hint: "Board sizes or custom" },
  { category: "Laminated Sticker", label: "Laminated", hint: "Quantity by size" },
]

export function CalculatorPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreateOrder = hasPermission("manage_orders")
  const { products } = useProductCatalog()
  const { categories, isLoading: categoriesLoading } = useCategories()
  const { settings } = useSettings()

  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [stickerWidth, setStickerWidth] = useState("")
  const [stickerHeight, setStickerHeight] = useState("")
  const [stickerUnit, setStickerUnit] = useState<StickerUnit>("in")
  const [productId, setProductId] = useState("")
  const [optionValues, setOptionValues] = useState<Record<string, string>>({})
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [dimensionUnit, setDimensionUnit] = useState<LengthUnit>("ft")
  const [isCustomSize, setIsCustomSize] = useState(false)
  const [customWidth, setCustomWidth] = useState("")
  const [customHeight, setCustomHeight] = useState("")
  const [customThickness, setCustomThickness] = useState<SintraThickness>("3mm")
  const [customBackToBack, setCustomBackToBack] = useState(false)

  const categoryProducts = products.filter(
    (product) => product.status === "Active" && product.category === category
  )

  useEffect(() => {
    if (categoryProducts.length === 1 && productId !== categoryProducts[0].id) {
      setProductId(categoryProducts[0].id)
      setOptionValues({})
    }
  }, [categoryProducts, productId])

  // Shared by handleCategoryChange (switching categories) and handleClearCurrent (an
  // explicit Clear button within the current category's own quotation card) — both reset
  // the exact same fields, the only difference being whether `category` itself changes.
  function resetCategoryFields() {
    setProductId("")
    setOptionValues({})
    setWidth("")
    setHeight("")
    setDimensionUnit("ft")
    setStickerWidth("")
    setStickerHeight("")
    setStickerUnit("in")
    setIsCustomSize(false)
    setCustomWidth("")
    setCustomHeight("")
    setCustomThickness("3mm")
    setCustomBackToBack(false)
  }

  function handleCategoryChange(next: ProductCategory) {
    setCategory(next)
    resetCategoryFields()
  }

  function handleClearCurrent() {
    resetCategoryFields()
  }

  function handleSelectStickerSize(size: CommonSize) {
    setStickerWidth(String(size.width))
    setStickerHeight(String(size.height))
    setStickerUnit(size.unit as StickerUnit)
  }

  function handleSelectTarpaulinSize(size: CommonSize) {
    setWidth(String(size.width))
    setHeight(String(size.height))
    setDimensionUnit(size.unit as LengthUnit)
  }

  function handleProductChange(id: string) {
    setProductId(id)
    setOptionValues({})
    setWidth("")
    setHeight("")
    setIsCustomSize(false)
    setCustomWidth("")
    setCustomHeight("")
    setCustomThickness("3mm")
    setCustomBackToBack(false)
  }

  const selectedProduct = categoryProducts.find((product) => product.id === productId) ?? null
  const resolution = selectedProduct ? resolvePricingPreview(selectedProduct, optionValues) : null
  const showsDimensions = resolution?.kind === "auto" && resolution.entry.unit === "sq.ft."
  const packageOption = selectedProduct?.options.find((option) => isPackageOptionName(option.name)) ?? null
  const packageCandidates =
    selectedProduct && packageOption ? previewPackageCandidates(selectedProduct, packageOption.id) : []
  const stickerCandidates = category === "Sticker" ? packageCandidates : []
  const laminatedCandidates = category === "Laminated Sticker" ? packageCandidates : []

  // Exact-name lookup — same pattern as getStatusFlowForCategory (order-status.ts). Laminated
  // Sticker has no config of its own; it always mirrors the Sticker Label bucket.
  const stickerLabelCategory = categories.find((c) => c.name === "Sticker")
  const tarpaulinCategory = categories.find((c) => c.name === "Tarpaulin")
  const quickSizes: CommonSize[] | null =
    category === "Sticker" || category === "Laminated Sticker"
      ? (stickerLabelCategory?.commonSizes ?? [])
      : category === "Tarpaulin"
        ? (tarpaulinCategory?.commonSizes ?? [])
        : null
  const width_ = Number(width)
  const height_ = Number(height)
  const hasValidSize = width_ > 0 && height_ > 0

  const isSintraCustom = category === "Sintra" && isCustomSize
  const customWidthNum = Number(customWidth)
  const customHeightNum = Number(customHeight)
  const hasValidCustomSize = customWidthNum > 0 && customHeightNum > 0

  const quote = isSintraCustom
    ? hasValidCustomSize
      ? calculateSintraCustomPrice({
          width: customWidthNum,
          height: customHeightNum,
          thickness: customThickness,
          backToBack: customBackToBack,
        })
      : null
    : resolution?.kind === "auto" && showsDimensions && hasValidSize
      ? convertToFeet(width_, dimensionUnit) * convertToFeet(height_, dimensionUnit) * resolution.entry.price
      : resolution?.kind === "auto" && !showsDimensions
        ? resolution.entry.price
        : null

  function handleCreateOrder() {
    const seed: OrderFormSeed =
      category === "Sticker" || category === "Laminated Sticker"
        ? { productId, stickerWidth, stickerHeight, stickerUnit }
        : isSintraCustom
          ? {
              productId,
              optionValues,
              isCustomSize: true,
              customWidth,
              customHeight,
              customThickness,
              customBackToBack,
            }
          : { productId, optionValues, width, height, dimensionUnit }
    navigate("/orders/new", { state: seed })
  }

  const canCreate =
    category === "Sticker" || category === "Laminated Sticker"
      ? !!productId && Number(stickerWidth) > 0 && Number(stickerHeight) > 0
      : isSintraCustom
        ? !!productId && hasValidCustomSize
        : !!productId

  const hasQuote =
    category === "Sticker"
      ? !!productId && Number(stickerWidth) > 0 && Number(stickerHeight) > 0
      : category === "Laminated Sticker"
        ? Number(stickerWidth) > 0 && Number(stickerHeight) > 0 && laminatedCandidates.length > 0
        : isSintraCustom
          ? hasValidCustomSize
          : quote !== null

  function buildQuoteText(): string | null {
    if (!category || !selectedProduct) return null

    const lines: string[] = [selectedProduct.name]

    if (category === "Sticker") {
      lines.push(`Size: ${stickerWidth} × ${stickerHeight} ${stickerUnit}`)
      lines.push("")
      for (const candidate of stickerCandidates) {
        const result = calculateStickerPackageResult(
          Number(stickerWidth),
          Number(stickerHeight),
          stickerUnit,
          candidate.price,
          candidate.packageName
        )
        const packageNumber = parsePackageNumber(candidate.packageName)
        const label = packageNumber !== null ? `Package ${packageNumber}` : (candidate.packageName ?? formatCurrency(candidate.price))
        lines.push(`${label}: ${formatCurrency(candidate.price)}`)
        lines.push(`${result.quantity} pcs + ${result.free} pcs free`)
        lines.push("")
      }
    } else if (category === "Laminated Sticker") {
      lines.push(`Size: ${stickerWidth} × ${stickerHeight} ${stickerUnit}`)
      for (const candidate of laminatedCandidates) {
        const qty = calculateLaminatedStickerQuotation(
          Number(stickerWidth),
          Number(stickerHeight),
          stickerUnit,
          candidate.price
        )
        lines.push(
          `${formatCurrency(candidate.price)} = ${qty} pcs`
        )
      }
    } else if (isSintraCustom) {
      lines.push(
        `Custom Size: ${customWidth} × ${customHeight} in, ${customThickness}` +
          (customBackToBack ? ", Back-to-Back" : "")
      )
      if (quote !== null) lines.push(`Total: ${formatCurrency(quote)}`)
    } else {
      for (const option of selectedProduct.options) {
        if (optionValues[option.id]) lines.push(`${option.name}: ${optionValues[option.id]}`)
      }
      if (showsDimensions && hasValidSize) lines.push(`${width} × ${height} ${dimensionUnit}`)
      if (quote !== null) lines.push(`Total: ${formatCurrency(quote)}`)
    }

    return lines.join("\n")
  }

  function handleCopyQuote() {
    const text = buildQuoteText()
    if (text !== null) copyToClipboard(text)
  }

  function handleCopyQuoteWithShipping() {
    const text = buildQuoteText()
    if (text !== null) copyToClipboard(appendShippingFeeNote(text, settings.shippingFee))
  }

  const categoryMeta = CATEGORIES.find((entry) => entry.category === category) ?? null
  const isStickerLike = category === "Sticker" || category === "Laminated Sticker"

  // One-line "how we got this number" under the total, so the price never appears unexplained.
  const quoteBreakdown: string | null = !selectedProduct
    ? null
    : isSintraCustom
      ? hasValidCustomSize
        ? `${customWidth} × ${customHeight} in · ${customThickness}${customBackToBack ? " · back-to-back" : ""}`
        : null
      : resolution?.kind === "auto" && showsDimensions && hasValidSize
        ? `${width} × ${height} ${dimensionUnit} · ${formatCurrency(resolution.entry.price)} / sq.ft.`
        : resolution?.kind === "auto" && !showsDimensions
          ? selectedProduct.name
          : null

  const stickerSummary =
    isStickerLike && Number(stickerWidth) > 0 && Number(stickerHeight) > 0
      ? {
          size: `${stickerWidth} × ${stickerHeight} ${stickerUnit}`,
          count: category === "Sticker" ? stickerCandidates.length : laminatedCandidates.length,
          noun: category === "Sticker" ? "package" : "price",
        }
      : null

  const noProducts = !!category && categoryProducts.length === 0

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Calculator"
        description="Get a quick price quotation before creating an order."
      />

      {/* One card, top to bottom: category → details (incl. the package/price list) → the quote and
          its buttons, directly under the prices and pinned to the bottom of the screen while scrolling. */}
      <Card className="w-full max-w-4xl gap-0 overflow-visible py-0">
        <CardContent className="flex flex-col gap-8 py-5">
          <FormSection step={1} title="Category" description="What are you quoting?">
              <ToggleGroup
                aria-label="Category"
                value={category ? [category] : []}
                onValueChange={(next) => {
                  const value = next[0] as ProductCategory | undefined
                  if (value) handleCategoryChange(value)
                }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {CATEGORIES.map((entry) => (
                  <ChoiceCard
                    key={entry.category}
                    value={entry.category}
                    title={entry.label}
                    description={entry.hint}
                  />
                ))}
              </ToggleGroup>
          </FormSection>

          {category && categoryMeta && (
            <FormSection
              key={category}
              step={2}
              title={`${categoryMeta.label} details`}
              description={
                isStickerLike
                  ? "Choose a product, then a size — every package is quoted."
                  : category === "Sintra"
                    ? "Choose a product, then a standard or custom size."
                    : "Choose a product and options, then a size."
              }
              className="animate-in border-t pt-6 duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
            >
                {noProducts ? (
                  <Empty className="border">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <PackageSearchIcon />
                      </EmptyMedia>
                      <EmptyTitle>No active {category} products</EmptyTitle>
                      <EmptyDescription>Add an active product in this category to get a quotation.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <>
                    <ProductPicker
                      id="calculator-product"
                      products={categoryProducts}
                      value={productId}
                      onChange={handleProductChange}
                    />

                    {category === "Sticker" && (
                      <>
                        <QuickSizeChips sizes={quickSizes ?? []} isLoading={categoriesLoading} onSelect={handleSelectStickerSize} />
                        <StickerQuotationFields
                          width={stickerWidth}
                          onWidthChange={setStickerWidth}
                          height={stickerHeight}
                          onHeightChange={setStickerHeight}
                          unit={stickerUnit}
                          onUnitChange={setStickerUnit}
                          candidates={stickerCandidates}
                          onClear={handleClearCurrent}
                        />
                      </>
                    )}

                    {category === "Laminated Sticker" && (
                      <>
                        <QuickSizeChips sizes={quickSizes ?? []} isLoading={categoriesLoading} onSelect={handleSelectStickerSize} />
                        <LaminatedStickerQuotationFields
                          width={stickerWidth}
                          onWidthChange={setStickerWidth}
                          height={stickerHeight}
                          onHeightChange={setStickerHeight}
                          unit={stickerUnit}
                          onUnitChange={setStickerUnit}
                          candidates={laminatedCandidates}
                          showAmount
                          onClear={handleClearCurrent}
                        />
                      </>
                    )}

                    {(category === "Tarpaulin" || category === "Sintra") && selectedProduct && (
                      <>
                        {category === "Sintra" && (
                          <Field>
                            <FieldLabel htmlFor="calculator-sintra-mode">Size</FieldLabel>
                            <ToggleGroup
                              id="calculator-sintra-mode"
                              aria-label="Sintra size mode"
                              value={[isCustomSize ? "custom" : "standard"]}
                              onValueChange={(next) => {
                                const value = next[0]
                                if (!value) return
                                const custom = value === "custom"
                                setIsCustomSize(custom)
                                if (custom) setOptionValues({})
                              }}
                              className={cn(SEGMENT_TRACK_CLASS, "w-fit")}
                            >
                              <Toggle value="standard" className={SEGMENT_CLASS}>
                                Standard sizes
                              </Toggle>
                              <Toggle value="custom" className={SEGMENT_CLASS}>
                                Custom size
                              </Toggle>
                            </ToggleGroup>
                          </Field>
                        )}

                        {!isSintraCustom && (
                          <ProductOptionsFields
                            product={selectedProduct}
                            values={optionValues}
                            onChange={(optionId, value) => setOptionValues((prev) => ({ ...prev, [optionId]: value }))}
                          />
                        )}

                        {isSintraCustom ? (
                          <SintraBoardCustomFields
                            width={customWidth}
                            onWidthChange={setCustomWidth}
                            height={customHeight}
                            onHeightChange={setCustomHeight}
                            thickness={customThickness}
                            onThicknessChange={setCustomThickness}
                            backToBack={customBackToBack}
                            onBackToBackChange={setCustomBackToBack}
                            onClear={handleClearCurrent}
                          />
                        ) : (
                          <>
                            {category === "Tarpaulin" && showsDimensions && (
                              <QuickSizeChips
                                sizes={quickSizes ?? []}
                                isLoading={categoriesLoading}
                                onSelect={handleSelectTarpaulinSize}
                              />
                            )}

                            {showsDimensions && (
                              <Field>
                                <FieldLabel htmlFor="calculator-width">Size</FieldLabel>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Input
                                    id="calculator-width"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    value={width}
                                    onChange={(event) => setWidth(event.target.value)}
                                    placeholder="Width"
                                    aria-label="Width"
                                    className="w-24"
                                  />
                                  <span className="text-sm text-muted-foreground">×</span>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step="0.01"
                                    value={height}
                                    onChange={(event) => setHeight(event.target.value)}
                                    placeholder="Height"
                                    aria-label="Height"
                                    className="w-24"
                                  />
                                  <Select value={dimensionUnit} onValueChange={(value) => setDimensionUnit(value as LengthUnit)}>
                                    <SelectTrigger className="w-24" aria-label="Unit">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {LENGTH_UNITS.map((unit) => (
                                        <SelectItem key={unit} value={unit}>
                                          {unit}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button type="button" variant="ghost" size="sm" onClick={handleClearCurrent}>
                                    <RotateCcwIcon data-icon="inline-start" />
                                    Start over
                                  </Button>
                                </div>
                              </Field>
                            )}

                            {resolution?.kind === "none" && <Hint>This product has no configured pricing yet.</Hint>}
                            {resolution?.kind === "package" && (
                              <Hint>This product uses package pricing — pick a package on the order form.</Hint>
                            )}
                            {showsDimensions && !hasValidSize && <Hint>Enter a width and height to see the price.</Hint>}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
            </FormSection>
          )}

          {!category && <p className="-mt-4 text-sm text-muted-foreground sm:pl-9">Pick a category to start a quote.</p>}
        </CardContent>

        {category && !noProducts && (
          // Quote footer: sits right under the package/price list and sticks to the bottom of the
          // viewport while a long list scrolls, so Copy / New order are always one tap away.
          <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-b-xl border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:flex-row-reverse sm:items-center sm:justify-between">
            <div aria-live="polite" className="min-w-0 sm:text-right">
              <span className="text-xs text-muted-foreground">Quote</span>
              {isStickerLike ? (
                stickerSummary ? (
                  <div className="flex flex-wrap items-baseline gap-x-2 sm:justify-end">
                    <span className="text-2xl leading-tight font-semibold tabular-nums">{stickerSummary.size}</span>
                    <span className="text-sm text-muted-foreground">
                      {stickerSummary.count} {stickerSummary.count === 1 ? stickerSummary.noun : `${stickerSummary.noun}s`}{" "}
                      quoted
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Enter a size to quote every package.</p>
                )
              ) : quote !== null ? (
                <div key={quote} className="flex animate-in flex-wrap items-baseline gap-x-2 duration-200 fade-in-0 motion-reduce:animate-none sm:justify-end">
                  <span className="text-2xl leading-tight font-semibold tabular-nums">{formatCurrency(quote)}</span>
                  {quoteBreakdown && <span className="text-sm text-muted-foreground tabular-nums">{quoteBreakdown}</span>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {selectedProduct ? "Finish the details to see the price." : "Choose a product to see the price."}
                </p>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-2 min-[420px]:grid-flow-col min-[420px]:auto-cols-fr sm:flex sm:items-center">
              <Button type="button" variant="outline" disabled={!hasQuote} onClick={handleCopyQuote}>
                <CopyIcon data-icon="inline-start" />
                Copy quote
              </Button>
              {isStickerLike && (
                <Button type="button" variant="outline" disabled={!hasQuote} onClick={handleCopyQuoteWithShipping}>
                  <TruckIcon data-icon="inline-start" />
                  Copy + shipping
                </Button>
              )}
              {canCreateOrder && (
                <Button disabled={!canCreate} onClick={handleCreateOrder}>
                  <PlusIcon data-icon="inline-start" />
                  New order
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

/** One product Select for every category (was copy-pasted per category). */
function ProductPicker({
  id,
  products,
  value,
  onChange,
}: {
  id: string
  products: Product[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>Product</FieldLabel>
      <Select value={value} onValueChange={(next) => onChange(next ?? "")}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select a product">
            {(selected: string | null) => products.find((product) => product.id === selected)?.name ?? "Select a product"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/** Small muted callout for "what to do next" hints — same style as the order form's notes. */
function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  )
}
