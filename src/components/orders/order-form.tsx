import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useOrders } from "@/lib/orders"
import type { Order, OrderItem, OrderItemPricing, SelectedOption } from "@/lib/orders"
import {
  computeLineTotal,
  isManualPricingProduct,
  resolvePricing,
} from "@/lib/pricing-resolver"
import { useProducts } from "@/lib/products"
import { generateId } from "@/lib/utils"

import { OrderSummaryPanel } from "./order-summary-panel"
import { PricingFields, type SizeUnit } from "./pricing-fields"
import { ProductOptionsFields } from "./product-options-fields"

export function OrderForm({ order }: { order: Order | null }) {
  const navigate = useNavigate()
  const { products } = useProducts()
  const { addOrder, updateOrder } = useOrders()

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [productId, setProductId] = useState("")
  const [optionValues, setOptionValues] = useState<Record<string, string>>({})
  const [packageEntryId, setPackageEntryId] = useState("")
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>("in")
  const [quantity, setQuantity] = useState("1")
  const [notes, setNotes] = useState("")
  const [manualProductName, setManualProductName] = useState("")
  const [manualUnitPrice, setManualUnitPrice] = useState("")
  const [discount, setDiscount] = useState("0")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const existingItem = order?.items[0] ?? null
  const selectedProduct = products.find((product) => product.id === productId) ?? null
  const isEditingMissingProduct = !!order && !!existingItem && !selectedProduct

  useEffect(() => {
    if (!order) return
    const item = order.items[0]
    if (!item) return

    setCustomerName(order.customerName)
    setCustomerPhone(order.customerPhone)
    setProductId(item.productId)
    setOptionValues(
      Object.fromEntries(item.selectedOptions.map((option) => [option.optionId, option.value]))
    )
    setQuantity(String(item.quantity))
    setNotes(item.notes)
    setDiscount(String(order.discount))

    if (item.pricing.pricingType === "Package") {
      setPackageEntryId(item.pricing.pricingEntryId)
      if (item.pricing.size) {
        setWidth(String(item.pricing.size.width))
        setHeight(String(item.pricing.size.height))
        setSizeUnit(item.pricing.size.unit)
      }
    } else if (item.pricing.pricingType === "Per Unit") {
      if (item.pricing.width && item.pricing.height) {
        setWidth(String(item.pricing.width))
        setHeight(String(item.pricing.height))
      }
    } else if (item.pricing.pricingType === "Manual") {
      setManualProductName(item.pricing.productName)
      setManualUnitPrice(String(item.pricing.unitPrice))
    }
  }, [order])

  function handleProductChange(id: string) {
    setProductId(id)
    setOptionValues({})
    setPackageEntryId("")
    setWidth("")
    setHeight("")
    setSizeUnit("in")
    setQuantity("1")
    setManualProductName("")
    setManualUnitPrice("")
  }

  const isManual = selectedProduct ? isManualPricingProduct(selectedProduct) : false
  const resolution =
    selectedProduct && !isManual ? resolvePricing(selectedProduct, optionValues) : { kind: "none" as const }

  function buildPricing(): OrderItemPricing | null {
    if (!selectedProduct) return null

    if (isManual) {
      const price = Number(manualUnitPrice)
      if (!manualProductName.trim() || !Number.isFinite(price) || price < 0) return null
      return { pricingType: "Manual", productName: manualProductName.trim(), unitPrice: price }
    }

    if (resolution.kind === "package") {
      const entry = resolution.candidates.find((candidate) => candidate.id === packageEntryId)
      if (!entry) return null
      const w = Number(width)
      const h = Number(height)
      const size = w > 0 && h > 0 ? { width: w, height: h, unit: sizeUnit } : undefined
      return {
        pricingType: "Package",
        pricingEntryId: entry.id,
        packageName: entry.packageName ?? entry.appliesTo,
        unitPrice: entry.price,
        unit: entry.unit,
        size,
      }
    }

    if (resolution.kind === "auto") {
      const entry = resolution.entry
      if (entry.pricingType === "Package") {
        const w = Number(width)
        const h = Number(height)
        const size = w > 0 && h > 0 ? { width: w, height: h, unit: sizeUnit } : undefined
        return {
          pricingType: "Package",
          pricingEntryId: entry.id,
          packageName: entry.packageName ?? entry.appliesTo,
          unitPrice: entry.price,
          unit: entry.unit,
          size,
        }
      }
      if (entry.pricingType === "Per Unit") {
        if (entry.unit === "sq.ft.") {
          const w = Number(width)
          const h = Number(height)
          if (!(w > 0) || !(h > 0)) return null
          return {
            pricingType: "Per Unit",
            pricingEntryId: entry.id,
            unitPrice: entry.price,
            unit: entry.unit,
            width: w,
            height: h,
          }
        }
        return { pricingType: "Per Unit", pricingEntryId: entry.id, unitPrice: entry.price, unit: entry.unit }
      }
      return { pricingType: "Fixed", pricingEntryId: entry.id, unitPrice: entry.price, unit: entry.unit }
    }

    return null
  }

  const previewPricing = buildPricing()
  const quantityNum = Math.max(1, Math.round(Number(quantity) || 1))
  const previewLineTotal = previewPricing
    ? computeLineTotal({ pricing: previewPricing, quantity: quantityNum })
    : 0
  const discountNum = Math.max(0, Number(discount) || 0)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!customerName.trim()) {
      toast.error("Customer name is required.")
      return
    }

    setIsSubmitting(true)
    try {
      if (order && isEditingMissingProduct && existingItem) {
        const total = Math.max(existingItem.lineTotal - discountNum, 0)
        updateOrder(order.id, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          discount: discountNum,
          total,
        })
        toast.success("Order updated.")
        navigate(`/orders/${order.id}`)
        return
      }

      if (!selectedProduct) {
        toast.error("Select a product.")
        return
      }

      if (!isManual) {
        const missingRequired = selectedProduct.options.some(
          (option) => option.required && !optionValues[option.id]
        )
        if (missingRequired) {
          toast.error("Select all required options.")
          return
        }
      }

      const pricing = buildPricing()
      if (!pricing) {
        toast.error("Complete the pricing fields for this product.")
        return
      }

      const selectedOptions: SelectedOption[] = Object.entries(optionValues).map(
        ([optionId, value]) => {
          const option = selectedProduct.options.find((candidate) => candidate.id === optionId)
          return { optionId, optionName: option?.name ?? "", value }
        }
      )

      const item: OrderItem = {
        id: existingItem?.id ?? generateId(),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productCategory: selectedProduct.category,
        selectedOptions,
        quantity: quantityNum,
        notes: notes.trim(),
        pricing,
        lineTotal: computeLineTotal({ pricing, quantity: quantityNum }),
      }

      const subtotal = item.lineTotal
      const total = Math.max(subtotal - discountNum, 0)

      if (order) {
        updateOrder(order.id, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: [item],
          subtotal,
          discount: discountNum,
          total,
        })
        toast.success("Order updated.")
        navigate(`/orders/${order.id}`)
      } else {
        const id = addOrder({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          status: "pending",
          items: [item],
          subtotal,
          discount: discountNum,
          total,
          notes: "",
        })
        toast.success("Order created.")
        navigate(`/orders/${id}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4 rounded-xl border p-4">
        <h3 className="text-sm font-medium">Order Information</h3>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="order-customer-name">Customer Name</FieldLabel>
              <Input
                id="order-customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Juan Dela Cruz"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="order-customer-phone">Phone</FieldLabel>
              <Input
                id="order-customer-phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="0917 000 0000"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="order-product">Product</FieldLabel>
            <Select value={productId} onValueChange={(value) => handleProductChange(value as string)}>
              <SelectTrigger id="order-product" className="w-full">
                <SelectValue placeholder="Select a product">
                  {(value: string | null) =>
                    products.find((product) => product.id === value)?.name ?? "Select a product"
                  }
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

          {isEditingMissingProduct && (
            <p className="text-sm text-muted-foreground">
              This order's product is no longer in the catalog, so pricing can't be recalculated.
              You can still update the customer info, discount, and status.
            </p>
          )}

          {selectedProduct && !isEditingMissingProduct && isManual && (
            <>
              <Field>
                <FieldLabel htmlFor="order-manual-name">Product Name</FieldLabel>
                <Input
                  id="order-manual-name"
                  value={manualProductName}
                  onChange={(event) => setManualProductName(event.target.value)}
                  placeholder="Customized Mug"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="order-quantity">Quantity</FieldLabel>
                  <Input
                    id="order-quantity"
                    type="number"
                    min={1}
                    step="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="order-manual-price">Price</FieldLabel>
                  <Input
                    id="order-manual-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={manualUnitPrice}
                    onChange={(event) => setManualUnitPrice(event.target.value)}
                  />
                </Field>
              </div>
            </>
          )}

          {selectedProduct && !isEditingMissingProduct && !isManual && (
            <>
              <ProductOptionsFields
                product={selectedProduct}
                values={optionValues}
                onChange={(optionId, value) =>
                  setOptionValues((prev) => ({ ...prev, [optionId]: value }))
                }
              />
              <PricingFields
                resolution={resolution}
                packageEntryId={packageEntryId}
                onPackageEntryIdChange={setPackageEntryId}
                width={width}
                onWidthChange={setWidth}
                height={height}
                onHeightChange={setHeight}
                sizeUnit={sizeUnit}
                onSizeUnitChange={setSizeUnit}
                quantity={quantity}
                onQuantityChange={setQuantity}
              />
            </>
          )}

          {selectedProduct && !isEditingMissingProduct && (
            <Field>
              <FieldLabel htmlFor="order-notes">Notes</FieldLabel>
              <Textarea
                id="order-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Please use the uploaded design."
              />
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="order-discount">Discount</FieldLabel>
            <Input
              id="order-discount"
              type="number"
              min={0}
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </Field>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {order ? "Update Order" : "Create Order"}
          </Button>
        </div>
      </div>

      <OrderSummaryPanel
        product={isEditingMissingProduct ? null : selectedProduct}
        optionValues={optionValues}
        pricing={isEditingMissingProduct ? null : previewPricing}
        quantity={quantityNum}
        lineTotal={isEditingMissingProduct ? (existingItem?.lineTotal ?? 0) : previewLineTotal}
        discount={discountNum}
      />
    </form>
  )
}
