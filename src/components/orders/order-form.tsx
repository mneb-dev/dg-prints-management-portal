import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const existingItem = order?.items[0] ?? null
  const selectedProduct = products.find((product) => product.id === productId) ?? null
  const isEditingMissingProduct = !!order && !!existingItem && !selectedProduct
  const activeProducts = products.filter((product) => product.status === "Active")

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
    clearError("product")
    clearError("options")
    clearError("pricing")
  }

  function handleWidthChange(value: string) {
    setWidth(value)
    clearError("pricing")
  }

  function handleHeightChange(value: string) {
    setHeight(value)
    clearError("pricing")
  }

  function handlePackageEntryIdChange(value: string) {
    setPackageEntryId(value)
    clearError("pricing")
  }

  function handleQuantityChange(value: string) {
    setQuantity(value)
    clearError("pricing")
  }

  function handleDimensionUnitChange(value: LengthUnit) {
    setDimensionUnit(value)
    clearError("pricing")
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}

    if (!customerName.trim()) {
      nextErrors.customerName = "Customer name is required."
    }

    if (!channel) {
      nextErrors.channel = "Order channel is required."
    }

    if (shippingEnabled) {
      const resolvedName = sameName ? customerName : shippingName
      const resolvedPhone = samePhone ? customerPhone : shippingPhone
      if (!resolvedName.trim() || !resolvedPhone.trim() || !shippingAddress.trim()) {
        nextErrors.shipping = "Name, phone, and address are required."
      }
    }

    if (markPaid) {
      const effectiveMethod = channel === "Shopee" ? "Bank Transfer" : paymentMethod
      if (!effectiveMethod) {
        nextErrors.paymentMethod = "Select a payment method."
      }
      if (paymentStatus === "partially_paid") {
        const dp = Number(downPayment)
        if (!Number.isFinite(dp) || dp <= 0 || dp >= previewTotal) {
          nextErrors.downPayment = "Must be greater than 0 and less than the total."
        }
      }
    }

    const isMissingProductEdit = !!order && isEditingMissingProduct

    if (!isMissingProductEdit) {
      if (!selectedProduct) {
        nextErrors.product = "Select a product."
      } else if (selectedProduct.status !== "Active") {
        nextErrors.product = "This product is inactive and can't be used for new or updated orders."
      } else if (!isManual) {
        const missingRequired = selectedProduct.options.some(
          (option) => option.required && !optionValues[option.id]
        )
        if (missingRequired) {
          nextErrors.options = "Select all required options."
        }
      }

      if (selectedProduct && !buildPricing()) {
        nextErrors.pricing = "Complete the pricing fields for this product."
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})

    setIsSubmitting(true)
    try {
      if (order && isEditingMissingProduct && existingItem) {
        const total = Math.max(
          existingItem.lineTotal + additionalFeesNum + shippingFeeNum - discountNum,
          0
        )
        await updateOrder(order.id, {
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
        return
      }

      const pricing = buildPricing()
      if (!pricing) {
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
        await updateOrder(order.id, {
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
        const created = await addOrder({
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
        navigate(`/orders/${created.id}`)
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save order.")
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
                <Field data-invalid={!!errors.customerName}>
                  <FieldLabel htmlFor="order-customer-name">Customer Name</FieldLabel>
                  <Input
                    id="order-customer-name"
                    value={customerName}
                    onChange={(event) => {
                      setCustomerName(event.target.value)
                      clearError("customerName")
                    }}
                    placeholder="Juan Dela Cruz"
                    aria-invalid={!!errors.customerName}
                  />
                  <FieldError>{errors.customerName}</FieldError>
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
              <Field data-invalid={!!errors.product}>
                <FieldLabel htmlFor="order-product">Product</FieldLabel>
                <Select value={productId} onValueChange={(value) => handleProductChange(value as string)}>
                  <SelectTrigger id="order-product" className="w-full" aria-invalid={!!errors.product}>
                    <SelectValue placeholder="Select a product">
                      {(value: string | null) =>
                        products.find((product) => product.id === value)?.name ?? "Select a product"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.product}</FieldError>
              </Field>

              {isEditingMissingProduct && (
                <p className="text-sm text-muted-foreground">
                  This order's product is no longer in the catalog, so pricing can't be recalculated.
                  You can still update the customer info, discount, and status.
                </p>
              )}

              {selectedProduct && !isEditingMissingProduct && isManual && (
                <>
                  <Field data-invalid={!!errors.pricing}>
                    <FieldLabel htmlFor="order-manual-name">Product Name</FieldLabel>
                    <Input
                      id="order-manual-name"
                      value={manualProductName}
                      onChange={(event) => {
                        setManualProductName(event.target.value)
                        clearError("pricing")
                      }}
                      placeholder="Customized Mug"
                      aria-invalid={!!errors.pricing}
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
                        onChange={(event) => handleQuantityChange(event.target.value)}
                      />
                    </Field>
                    <Field data-invalid={!!errors.pricing}>
                      <FieldLabel htmlFor="order-manual-price">Price</FieldLabel>
                      <Input
                        id="order-manual-price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={manualUnitPrice}
                        onChange={(event) => {
                          setManualUnitPrice(event.target.value)
                          clearError("pricing")
                        }}
                        aria-invalid={!!errors.pricing}
                      />
                    </Field>
                  </div>
                  <FieldError>{errors.pricing}</FieldError>
                </>
              )}

              {selectedProduct && !isEditingMissingProduct && !isManual && (
                <>
                  <ProductOptionsFields
                    product={selectedProduct}
                    values={optionValues}
                    onChange={(optionId, value) => {
                      setOptionValues((prev) => ({ ...prev, [optionId]: value }))
                      clearError("options")
                    }}
                  />
                  <FieldError>{errors.options}</FieldError>
                  <PricingFields
                    resolution={resolution}
                    packageEntryId={packageEntryId}
                    onPackageEntryIdChange={handlePackageEntryIdChange}
                    width={width}
                    onWidthChange={handleWidthChange}
                    height={height}
                    onHeightChange={handleHeightChange}
                    dimensionUnit={dimensionUnit}
                    onDimensionUnitChange={handleDimensionUnitChange}
                    quantity={quantity}
                    onQuantityChange={handleQuantityChange}
                  />
                  <FieldError>{errors.pricing}</FieldError>
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
              onEnabledChange={(value) => {
                setShippingEnabled(value)
                clearError("shipping")
              }}
              customerName={customerName}
              customerPhone={customerPhone}
              sameName={sameName}
              onSameNameChange={setSameName}
              samePhone={samePhone}
              onSamePhoneChange={setSamePhone}
              name={shippingName}
              onNameChange={(value) => {
                setShippingName(value)
                clearError("shipping")
              }}
              phone={shippingPhone}
              onPhoneChange={(value) => {
                setShippingPhone(value)
                clearError("shipping")
              }}
              address={shippingAddress}
              onAddressChange={(value) => {
                setShippingAddress(value)
                clearError("shipping")
              }}
              fee={shippingFee}
              onFeeChange={setShippingFee}
              error={errors.shipping}
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
              onChannelChange={(value) => {
                setChannel(value)
                clearError("channel")
              }}
              markPaid={markPaid}
              onMarkPaidChange={setMarkPaid}
              paymentStatus={paymentStatus}
              onPaymentStatusChange={setPaymentStatus}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={(value) => {
                setPaymentMethod(value)
                clearError("paymentMethod")
              }}
              downPayment={downPayment}
              onDownPaymentChange={(value) => {
                setDownPayment(value)
                clearError("downPayment")
              }}
              total={previewTotal}
              errors={{
                channel: errors.channel,
                paymentMethod: errors.paymentMethod,
                downPayment: errors.downPayment,
              }}
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

      <div className="lg:sticky lg:top-20 lg:self-start">
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
      </div>
    </form>
  )
}
