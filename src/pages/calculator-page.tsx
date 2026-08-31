import { useEffect, useState } from "react"
import { FlagIcon, LayoutPanelLeftIcon, PlusIcon, StickerIcon, type LucideIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { type OrderFormSeed } from "@/components/orders/order-form"
import { ProductOptionsFields } from "@/components/orders/product-options-fields"
import { StickerQuotationFields } from "@/components/orders/sticker-quotation-fields"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useAuth } from "@/lib/auth"
import { convertToFeet, LENGTH_UNITS, type LengthUnit } from "@/lib/length-units"
import { resolvePricing } from "@/lib/pricing-resolver"
import { useProductCatalog, type ProductCategory } from "@/lib/products"
import { type StickerUnit } from "@/lib/sticker-quotation"
import { formatCurrency } from "@/lib/utils"

const CATEGORIES: { category: ProductCategory; label: string; icon: LucideIcon }[] = [
  { category: "Sticker Label", label: "Sticker", icon: StickerIcon },
  { category: "Tarpaulin", label: "Tarpaulin", icon: FlagIcon },
  { category: "Sintra Board", label: "Sintra", icon: LayoutPanelLeftIcon },
]

export function CalculatorPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreateOrder = hasPermission("manage_orders")
  const { products } = useProductCatalog()

  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [stickerWidth, setStickerWidth] = useState("")
  const [stickerHeight, setStickerHeight] = useState("")
  const [stickerUnit, setStickerUnit] = useState<StickerUnit>("in")
  const [productId, setProductId] = useState("")
  const [optionValues, setOptionValues] = useState<Record<string, string>>({})
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [dimensionUnit, setDimensionUnit] = useState<LengthUnit>("ft")

  const categoryProducts = products.filter(
    (product) => product.status === "Active" && product.category === category
  )

  useEffect(() => {
    if (categoryProducts.length === 1 && productId !== categoryProducts[0].id) {
      setProductId(categoryProducts[0].id)
      setOptionValues({})
    }
  }, [categoryProducts, productId])

  function handleCategoryChange(next: ProductCategory) {
    setCategory(next)
    setProductId("")
    setOptionValues({})
    setWidth("")
    setHeight("")
    setDimensionUnit("ft")
    setStickerWidth("")
    setStickerHeight("")
    setStickerUnit("in")
  }

  function handleProductChange(id: string) {
    setProductId(id)
    setOptionValues({})
    setWidth("")
    setHeight("")
  }

  const selectedProduct = categoryProducts.find((product) => product.id === productId) ?? null
  const resolution = selectedProduct ? resolvePricing(selectedProduct, optionValues) : null
  const showsDimensions = resolution?.kind === "auto" && resolution.entry.unit === "sq.ft."
  const width_ = Number(width)
  const height_ = Number(height)
  const hasValidSize = width_ > 0 && height_ > 0

  const quote =
    resolution?.kind === "auto" && showsDimensions && hasValidSize
      ? convertToFeet(width_, dimensionUnit) * convertToFeet(height_, dimensionUnit) * resolution.entry.price
      : resolution?.kind === "auto" && !showsDimensions
        ? resolution.entry.price
        : null

  function handleCreateOrder() {
    const seed: OrderFormSeed =
      category === "Sticker Label"
        ? { productId, stickerWidth, stickerHeight, stickerUnit }
        : { productId, optionValues, width, height, dimensionUnit }
    navigate("/orders/new", { state: seed })
  }

  const canCreate =
    category === "Sticker Label"
      ? !!productId && Number(stickerWidth) > 0 && Number(stickerHeight) > 0
      : !!productId

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

      {category === "Sticker Label" && (
        <Card>
          <CardHeader>
            <CardTitle>Sticker Quotation</CardTitle>
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

                <StickerQuotationFields
                  width={stickerWidth}
                  onWidthChange={setStickerWidth}
                  height={stickerHeight}
                  onHeightChange={setStickerHeight}
                  unit={stickerUnit}
                  onUnitChange={setStickerUnit}
                  selectedPackage={null}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {(category === "Tarpaulin" || category === "Sintra Board") && (
        <Card>
          <CardHeader>
            <CardTitle>{category} Quotation</CardTitle>
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

                {selectedProduct && (
                  <ProductOptionsFields
                    product={selectedProduct}
                    values={optionValues}
                    onChange={(optionId, value) =>
                      setOptionValues((prev) => ({ ...prev, [optionId]: value }))
                    }
                  />
                )}

                {selectedProduct && showsDimensions && (
                  <div className="grid grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel htmlFor="calculator-width">Width</FieldLabel>
                      <Input
                        id="calculator-width"
                        type="number"
                        min={0}
                        step="0.01"
                        value={width}
                        onChange={(event) => setWidth(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="calculator-height">Height</FieldLabel>
                      <Input
                        id="calculator-height"
                        type="number"
                        min={0}
                        step="0.01"
                        value={height}
                        onChange={(event) => setHeight(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="calculator-unit">Unit</FieldLabel>
                      <Select
                        value={dimensionUnit}
                        onValueChange={(value) => setDimensionUnit(value as LengthUnit)}
                      >
                        <SelectTrigger id="calculator-unit">
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
                    </Field>
                  </div>
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
          </CardContent>
        </Card>
      )}

      {category && canCreateOrder && (
        <div>
          <Button disabled={!canCreate} onClick={handleCreateOrder}>
            <PlusIcon data-icon="inline-start" />
            Create order
          </Button>
        </div>
      )}
    </div>
  )
}
