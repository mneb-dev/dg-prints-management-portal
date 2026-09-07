import { useEffect, useState } from "react"
import {
  CopyIcon,
  FlagIcon,
  LayersIcon,
  LayoutPanelLeftIcon,
  PlusIcon,
  StickerIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { LaminatedStickerQuotationFields } from "@/components/orders/laminated-sticker-quotation-fields"
import { type OrderFormSeed } from "@/components/orders/order-form"
import { ProductOptionsFields } from "@/components/orders/product-options-fields"
import { QuickSizeChips } from "@/components/orders/quick-size-chips"
import { SintraBoardCustomFields } from "@/components/orders/sintra-board-custom-fields"
import { StickerQuotationFields } from "@/components/orders/sticker-quotation-fields"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth"
import { useCategories, useHotSizes, type CommonSize } from "@/lib/categories"
import { copyToClipboard } from "@/lib/clipboard"
import { calculateLaminatedStickerQuotation } from "@/lib/laminated-sticker-quotation"
import { convertToFeet, LENGTH_UNITS, type LengthUnit } from "@/lib/length-units"
import { isPackageOptionName, previewPackageCandidates, resolvePricingPreview } from "@/lib/pricing-resolver"
import { useProductCatalog, type ProductCategory } from "@/lib/products"
import { appendShippingFeeNote } from "@/lib/quote-text"
import { useSettings } from "@/lib/settings"
import { calculateSintraCustomPrice, type SintraThickness } from "@/lib/sintra-board-pricing"
import { calculateStickerPackageResult, parsePackageNumber, type StickerUnit } from "@/lib/sticker-quotation"
import { formatCurrency } from "@/lib/utils"

const CATEGORIES: { category: ProductCategory; label: string; icon: LucideIcon }[] = [
  { category: "Sticker", label: "Sticker", icon: StickerIcon },
  { category: "Tarpaulin", label: "Tarpaulin", icon: FlagIcon },
  { category: "Sintra", label: "Sintra", icon: LayoutPanelLeftIcon },
  { category: "Laminated Sticker", label: "Laminated", icon: LayersIcon },
]

export function CalculatorPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreateOrder = hasPermission("manage_orders")
  const { products } = useProductCatalog()
  const { categories } = useCategories()
  const { hotSizes, isLoading: hotSizesLoading } = useHotSizes()
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
      ? [...(stickerLabelCategory?.commonSizes ?? []), ...(hotSizes?.stickerLabel ?? [])]
      : category === "Tarpaulin"
        ? [...(tarpaulinCategory?.commonSizes ?? []), ...(hotSizes?.tarpaulin ?? [])]
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Calculator"
        description="Get a quick price quotation before creating an order."
      />

      <Card>
        <CardHeader>
          <CardTitle>Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ category: value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={category === value ? "default" : "outline"}
              onClick={() => handleCategoryChange(value)}
            >
              <Icon data-icon="inline-start" />
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {category === "Sticker" && (
        <Card className="animate-in fade-in-0 duration-150">
          <CardHeader>
            <CardTitle>Sticker Quotation</CardTitle>
            <CardAction>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearCurrent}>
                Clear
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {categoryProducts.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No active {category} products</EmptyTitle>
                  <EmptyDescription>
                    Add an active product in this category to get a quotation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="calculator-sticker-product">Product</FieldLabel>
                  <Select value={productId} onValueChange={(value) => handleProductChange(value ?? "")}>
                    <SelectTrigger id="calculator-sticker-product" className="w-full">
                      <SelectValue placeholder="Select a product">
                        {(value: string | null) => {
                          const product = categoryProducts.find((candidate) => candidate.id === value)
                          return product ? product.name : "Select a product"
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <QuickSizeChips
                  sizes={quickSizes ?? []}
                  isLoading={hotSizesLoading}
                  onSelect={handleSelectStickerSize}
                />

                <StickerQuotationFields
                  width={stickerWidth}
                  onWidthChange={setStickerWidth}
                  height={stickerHeight}
                  onHeightChange={setStickerHeight}
                  unit={stickerUnit}
                  onUnitChange={setStickerUnit}
                  candidates={stickerCandidates}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {category === "Laminated Sticker" && (
        <Card className="animate-in fade-in-0 duration-150">
          <CardHeader>
            <CardTitle>Laminated Sticker Quotation</CardTitle>
            <CardAction>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearCurrent}>
                Clear
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {categoryProducts.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No active {category} products</EmptyTitle>
                  <EmptyDescription>
                    Add an active product in this category to get a quotation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="calculator-laminated-sticker-product">Product</FieldLabel>
                  <Select value={productId} onValueChange={(value) => handleProductChange(value ?? "")}>
                    <SelectTrigger id="calculator-laminated-sticker-product" className="w-full">
                      <SelectValue placeholder="Select a product">
                        {(value: string | null) => {
                          const product = categoryProducts.find((candidate) => candidate.id === value)
                          return product ? product.name : "Select a product"
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <QuickSizeChips
                  sizes={quickSizes ?? []}
                  isLoading={hotSizesLoading}
                  onSelect={handleSelectStickerSize}
                />

                <LaminatedStickerQuotationFields
                  width={stickerWidth}
                  onWidthChange={setStickerWidth}
                  height={stickerHeight}
                  onHeightChange={setStickerHeight}
                  unit={stickerUnit}
                  onUnitChange={setStickerUnit}
                  candidates={laminatedCandidates}
                  showAmount
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {(category === "Tarpaulin" || category === "Sintra") && (
        <Card className="animate-in fade-in-0 duration-150">
          <CardHeader>
            <CardTitle>{category} Quotation</CardTitle>
            <CardAction>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearCurrent}>
                Clear
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {categoryProducts.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No active {category} products</EmptyTitle>
                  <EmptyDescription>
                    Add an active product in this category to get a quotation.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="calculator-product">Product</FieldLabel>
                  <Select value={productId} onValueChange={(value) => handleProductChange(value ?? "")}>
                    <SelectTrigger id="calculator-product" className="w-full">
                      <SelectValue placeholder="Select a product">
                        {(value: string | null) => {
                          const product = categoryProducts.find((candidate) => candidate.id === value)
                          return product ? product.name : "Select a product"
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {selectedProduct && !isSintraCustom && (
                  <ProductOptionsFields
                    product={selectedProduct}
                    values={optionValues}
                    onChange={(optionId, value) =>
                      setOptionValues((prev) => ({ ...prev, [optionId]: value }))
                    }
                  />
                )}

                {selectedProduct && category === "Sintra" && (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Switch
                      checked={isCustomSize}
                      onCheckedChange={(checked) => {
                        setIsCustomSize(!!checked)
                        if (checked) setOptionValues({})
                      }}
                    />
                    Custom size
                  </label>
                )}

                {selectedProduct && isSintraCustom ? (
                  <SintraBoardCustomFields
                    width={customWidth}
                    onWidthChange={setCustomWidth}
                    height={customHeight}
                    onHeightChange={setCustomHeight}
                    thickness={customThickness}
                    onThicknessChange={setCustomThickness}
                    backToBack={customBackToBack}
                    onBackToBackChange={setCustomBackToBack}
                  />
                ) : (
                  <>
                    {selectedProduct && category === "Tarpaulin" && showsDimensions && (
                      <QuickSizeChips
                        sizes={quickSizes ?? []}
                        isLoading={hotSizesLoading}
                        onSelect={handleSelectTarpaulinSize}
                      />
                    )}

                    {selectedProduct && showsDimensions && (
                      <Field>
                        <FieldLabel>Size</FieldLabel>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={width}
                            onChange={(event) => setWidth(event.target.value)}
                            placeholder="Width"
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">×</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={height}
                            onChange={(event) => setHeight(event.target.value)}
                            placeholder="Height"
                            className="w-20"
                          />
                          <Select
                            value={dimensionUnit}
                            onValueChange={(value) => setDimensionUnit(value as LengthUnit)}
                          >
                            <SelectTrigger className="w-24">
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
                        </div>
                      </Field>
                    )}

                    {selectedProduct && resolution?.kind === "none" && (
                      <FieldDescription>This product has no configured pricing yet.</FieldDescription>
                    )}

                    {selectedProduct && resolution?.kind === "package" && (
                      <FieldDescription>
                        This product uses package pricing — pick a package on the order form.
                      </FieldDescription>
                    )}

                    {selectedProduct && showsDimensions && !hasValidSize && (
                      <FieldDescription>Enter width and height to see a quote.</FieldDescription>
                    )}

                    {quote !== null && (
                      <p className="text-2xl font-semibold">{formatCurrency(quote)}</p>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {category && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!hasQuote} onClick={handleCopyQuote}>
            <CopyIcon data-icon="inline-start" />
            Copy quote
          </Button>
          {(category === "Sticker" || category === "Laminated Sticker") && (
            <Button type="button" variant="outline" disabled={!hasQuote} onClick={handleCopyQuoteWithShipping}>
             <TruckIcon  data-icon="inline-start" /> Copy quote + SF
            </Button>
          )}
          {canCreateOrder && (
            <Button disabled={!canCreate} onClick={handleCreateOrder}>
              <PlusIcon data-icon="inline-start" />
              New Order
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
