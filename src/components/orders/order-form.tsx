import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { convertToFeet, type LengthUnit } from "@/lib/length-units"
import { getStatusFlowForCategory, useOrders } from "@/lib/orders"
import type {
  Order,
  OrderChannel,
  OrderItem,
  OrderItemPricing,
  Payment,
  PaymentMethod,
  SelectedOption,
} from "@/lib/orders"
import {
  computeLineTotal,
  isManualPricingProduct,
  resolvePricing,
} from "@/lib/pricing-resolver"
import { useProducts } from "@/lib/products"
import { calculateStickerQuotation, nearestPackageTier, type StickerUnit } from "@/lib/sticker-quotation"
import { generateId } from "@/lib/utils"

import { OrderSummaryPanel } from "./order-summary-panel"
import { PaymentFields } from "./payment-fields"
import { PricingFields, type SizeUnit } from "./pricing-fields"
import { ProductOptionsFields } from "./product-options-fields"
import { ShippingAddressFields } from "./shipping-address-fields"
import { StickerQuotationFields } from "./sticker-quotation-fields"

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
  const [dimensionUnit, setDimensionUnit] = useState<LengthUnit>("ft")
  const [quantity, setQuantity] = useState("1")
  const [stickerWidth, setStickerWidth] = useState("")
  const [stickerHeight, setStickerHeight] = useState("")
  const [stickerUnit, setStickerUnit] = useState<StickerUnit>("cm")
  const [notes, setNotes] = useState("")
  const [manualProductName, setManualProductName] = useState("")
  const [manualUnitPrice, setManualUnitPrice] = useState("")
  const [discount, setDiscount] = useState("0")
  const [additionalFees, setAdditionalFees] = useState("0")
  const [shippingEnabled, setShippingEnabled] = useState(false)
  const [sameName, setSameName] = useState(true)
  const [samePhone, setSamePhone] = useState(true)
  const [shippingName, setShippingName] = useState("")
  const [shippingPhone, setShippingPhone] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [shippingFee, setShippingFee] = useState("0")
  const [channel, setChannel] = useState<OrderChannel | "">("")
  const [markPaid, setMarkPaid] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partially_paid">("paid")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [downPayment, setDownPayment] = useState("")
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
    setAdditionalFees(String(order.additionalFees))

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

    if (item.stickerQuotation) {
      setStickerWidth(String(item.stickerQuotation.width))
      setStickerHeight(String(item.stickerQuotation.height))
      setStickerUnit(item.stickerQuotation.unit)
    }

    if (order.shippingAddress) {
      setShippingEnabled(true)
      setSameName(order.shippingAddress.name === order.customerName)
      setSamePhone(order.shippingAddress.phone === order.customerPhone)
      setShippingName(order.shippingAddress.name)
      setShippingPhone(order.shippingAddress.phone)
      setShippingAddress(order.shippingAddress.address)
      setShippingFee(String(order.shippingAddress.fee ?? 0))
    }

    setChannel(order.channel)
    if (order.payment.status !== "unpaid") {
      setMarkPaid(true)
      setPaymentStatus(order.payment.status === "paid" ? "paid" : "partially_paid")
      setPaymentMethod(order.payment.method ?? "")
      setDownPayment(String(order.payment.downPayment))
    }
  }, [order])

  function handleProductChange(id: string) {
    setProductId(id)
    setOptionValues({})
    setPackageEntryId("")
    setWidth("")
    setHeight("")
    setSizeUnit("in")
    setDimensionUnit("ft")
    setQuantity("1")
    setManualProductName("")
    setManualUnitPrice("")
    setStickerWidth("")
    setStickerHeight("")
    setStickerUnit("cm")
  }

  const isManual = selectedProduct ? isManualPricingProduct(selectedProduct) : false
  const resolution =
    selectedProduct && !isManual ? resolvePricing(selectedProduct, optionValues) : { kind: "none" as const }

  const selectedPackagePricingEntry =
    resolution.kind === "package"
      ? resolution.candidates.find((candidate) => candidate.id === packageEntryId) ?? null
      : null
  const selectedStickerPackage = selectedPackagePricingEntry
    ? nearestPackageTier(selectedPackagePricingEntry.price)
    : null

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
          const w = convertToFeet(Number(width), dimensionUnit)
          const h = convertToFeet(Number(height), dimensionUnit)
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
  const additionalFeesNum = Math.max(0, Number(additionalFees) || 0)
  const shippingFeeNum = shippingEnabled ? Math.max(0, Number(shippingFee) || 0) : 0
  const previewTotal = isEditingMissingProduct
    ? Math.max((existingItem?.lineTotal ?? 0) + additionalFeesNum + shippingFeeNum - discountNum, 0)
    : Math.max(previewLineTotal + additionalFeesNum + shippingFeeNum - discountNum, 0)

  const stickerQuotationPackage =
    selectedProduct?.category === "Sticker Label" ? selectedStickerPackage : null

  const stickerWidthNum = Number(stickerWidth)
  const stickerHeightNum = Number(stickerHeight)
  const hasValidStickerSize = stickerWidthNum > 0 && stickerHeightNum > 0
  const stickerQuotation = hasValidStickerSize
    ? calculateStickerQuotation(stickerWidthNum, stickerHeightNum, stickerUnit)
    : null
  const stickerQuotationResult =
    stickerQuotationPackage && stickerQuotation ? stickerQuotation[stickerQuotationPackage] : null
  const stickerQuotationSnapshot =
    stickerQuotationPackage && stickerQuotationResult
      ? {
          package: stickerQuotationPackage,
          width: stickerWidthNum,
          height: stickerHeightNum,
          unit: stickerUnit,
          ...stickerQuotationResult,
        }
      : null

  function resolveShippingAddress() {
    if (!shippingEnabled) return null
    return {
      name: (sameName ? customerName : shippingName).trim(),
      phone: (samePhone ? customerPhone : shippingPhone).trim(),
      address: shippingAddress.trim(),
      fee: shippingFeeNum,
    }
  }

  function resolvePayment(total: number): Payment {
    if (!markPaid) return { status: "unpaid", method: null, downPayment: 0, balance: total }
    const method = channel === "Shopee" ? "Bank Transfer" : (paymentMethod as PaymentMethod)
    if (paymentStatus === "paid") {
      return { status: "paid", method, downPayment: total, balance: 0 }
    }
    const dp = Number(downPayment) || 0
    return { status: "partially_paid", method, downPayment: dp, balance: Math.max(total - dp, 0) }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!customerName.trim()) {
      toast.error("Customer name is required.")
      return
    }

    if (!channel) {
      toast.error("Order channel is required.")
      return
    }

    if (shippingEnabled) {
      const resolvedName = sameName ? customerName : shippingName
      const resolvedPhone = samePhone ? customerPhone : shippingPhone
      if (!resolvedName.trim() || !resolvedPhone.trim() || !shippingAddress.trim()) {
        toast.error("Shipping address fields are required.")
        return
      }
    }

    if (markPaid) {
      const effectiveMethod = channel === "Shopee" ? "Bank Transfer" : paymentMethod
      if (!effectiveMethod) {
        toast.error("Select a payment method.")
        return
      }
      if (paymentStatus === "partially_paid") {
        const dp = Number(downPayment)
        if (!Number.isFinite(dp) || dp <= 0 || dp >= previewTotal) {
          toast.error("Down payment must be greater than 0 and less than the total.")
          return
        }
      }
    }

    setIsSubmitting(true)
    try {
      if (order && isEditingMissingProduct && existingItem) {
        const total = Math.max(
          existingItem.lineTotal + additionalFeesNum + shippingFeeNum - discountNum,
          0
        )
        updateOrder(order.id, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          discount: discountNum,
          additionalFees: additionalFeesNum,
          total,
          shippingAddress: resolveShippingAddress(),
          channel: channel as OrderChannel,
          payment: resolvePayment(total),
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
        stickerQuotation: stickerQuotationSnapshot,
      }

      const subtotal = item.lineTotal
      const total = Math.max(subtotal + additionalFeesNum + shippingFeeNum - discountNum, 0)

      if (order) {
        const validStatuses = getStatusFlowForCategory(item.productCategory)
        const status = validStatuses.includes(order.status) ? order.status : "pending"
        updateOrder(order.id, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          status,
          items: [item],
          subtotal,
          discount: discountNum,
          additionalFees: additionalFeesNum,
          total,
          shippingAddress: resolveShippingAddress(),
          channel: channel as OrderChannel,
          payment: resolvePayment(total),
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
          additionalFees: additionalFeesNum,
          total,
          notes: "",
          shippingAddress: resolveShippingAddress(),
          channel: channel as OrderChannel,
          payment: resolvePayment(total),
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
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
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
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
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
                    dimensionUnit={dimensionUnit}
                    onDimensionUnitChange={setDimensionUnit}
                    quantity={quantity}
                    onQuantityChange={setQuantity}
                  />
                </>
              )}

              {selectedProduct && !isEditingMissingProduct && selectedProduct.category === "Sticker Label" && (
                <StickerQuotationFields
                  width={stickerWidth}
                  onWidthChange={setStickerWidth}
                  height={stickerHeight}
                  onHeightChange={setStickerHeight}
                  unit={stickerUnit}
                  onUnitChange={setStickerUnit}
                  selectedPackage={selectedStickerPackage}
                />
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
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
          </CardHeader>
          <CardContent>
            <ShippingAddressFields
              enabled={shippingEnabled}
              onEnabledChange={setShippingEnabled}
              customerName={customerName}
              customerPhone={customerPhone}
              sameName={sameName}
              onSameNameChange={setSameName}
              samePhone={samePhone}
              onSamePhoneChange={setSamePhone}
              name={shippingName}
              onNameChange={setShippingName}
              phone={shippingPhone}
              onPhoneChange={setShippingPhone}
              address={shippingAddress}
              onAddressChange={setShippingAddress}
              fee={shippingFee}
              onFeeChange={setShippingFee}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
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

              <Field>
                <FieldLabel htmlFor="order-additional-fees">Additional Fees</FieldLabel>
                <Input
                  id="order-additional-fees"
                  type="number"
                  min={0}
                  step="0.01"
                  value={additionalFees}
                  onChange={(event) => setAdditionalFees(event.target.value)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentFields
              channel={channel}
              onChannelChange={setChannel}
              markPaid={markPaid}
              onMarkPaidChange={setMarkPaid}
              paymentStatus={paymentStatus}
              onPaymentStatusChange={setPaymentStatus}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              downPayment={downPayment}
              onDownPaymentChange={setDownPayment}
              total={previewTotal}
            />
          </CardContent>
        </Card>

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
        additionalFees={additionalFeesNum}
        shippingFee={shippingFeeNum}
        stickerQuotationResult={isEditingMissingProduct ? null : stickerQuotationResult}
      />
    </form>
  )
}
