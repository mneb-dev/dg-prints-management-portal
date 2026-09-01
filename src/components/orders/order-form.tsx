import { useEffect, useState } from "react"
import { PlusIcon } from "lucide-react"
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
import { useAuth } from "@/lib/auth"
import type { LengthUnit } from "@/lib/length-units"
import {
  buildOrderItem,
  computeLineItemPricing,
  createEmptyLineItemDraft,
  draftFromOrderItem,
  type LineItemDraft,
} from "@/lib/order-line-item"
import { canEditOrderMetadata, getStatusFlowForCategory, useOrderActions } from "@/lib/orders"
import type {
  Order,
  OrderAdminEditableFields,
  OrderChannel,
  OrderItem,
  Payment,
  PaymentMethod,
} from "@/lib/orders"
import { useProductCatalog } from "@/lib/products"
import type { SintraThickness } from "@/lib/sintra-board-pricing"
import type { StickerUnit } from "@/lib/sticker-quotation"
import { useUserOptions } from "@/lib/users"

import { OrderLineItemCard, type LineItemErrorKey } from "./order-line-item-card"
import { OrderSummaryPanel } from "./order-summary-panel"
import { PaymentFields } from "./payment-fields"
import { ShippingAddressFields } from "./shipping-address-fields"

// Converts between an ISO timestamp and the value a `datetime-local` input needs,
// in the browser's local timezone (the input has no timezone concept of its own).
function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export type OrderFormSeed = {
  productId?: string
  optionValues?: Record<string, string>
  width?: string
  height?: string
  dimensionUnit?: LengthUnit
  stickerWidth?: string
  stickerHeight?: string
  stickerUnit?: StickerUnit
  isCustomSize?: boolean
  customWidth?: string
  customHeight?: string
  customThickness?: SintraThickness
  customBackToBack?: boolean
}

export function OrderForm({
  order,
  initialValues,
}: {
  order: Order | null
  initialValues?: OrderFormSeed
}) {
  const navigate = useNavigate()
  const { products } = useProductCatalog()
  const { addOrder, updateOrder } = useOrderActions()
  const { role } = useAuth()
  const canEditMetadata = !!order && canEditOrderMetadata(role)
  const { users: userOptions } = useUserOptions(canEditMetadata)

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [items, setItems] = useState<LineItemDraft[]>([createEmptyLineItemDraft()])
  const [description, setDescription] = useState("")
  const [discount, setDiscount] = useState("0")
  const [additionalFees, setAdditionalFees] = useState("0")
  const [layoutFee, setLayoutFee] = useState("0")
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
  const [createdAtLocal, setCreatedAtLocal] = useState("")
  const [createdByValue, setCreatedByValue] = useState("")
  const [statusUpdatedAtLocal, setStatusUpdatedAtLocal] = useState("")
  const [statusUpdatedByValue, setStatusUpdatedByValue] = useState("")

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function clearAllItemErrors() {
    setErrors((prev) => {
      const next: Record<string, string> = {}
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith("item-")) next[key] = value
      }
      return next
    })
  }

  const activeProducts = products.filter((product) => product.status === "Active")

  function updateItemAt(index: number, next: LineItemDraft) {
    setItems((prev) => prev.map((draft, i) => (i === index ? next : draft)))
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyLineItemDraft()])
  }

  function removeItemAt(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
    clearAllItemErrors()
  }

  useEffect(() => {
    if (!order) return
    setCustomerName(order.customerName)
    setCustomerPhone(order.customerPhone)
    setDescription(order.description ?? "")
    setDiscount(String(order.discount))
    setAdditionalFees(String(order.additionalFees))
    setLayoutFee(String(order.layoutFee))
    setItems(order.items.length > 0 ? order.items.map(draftFromOrderItem) : [createEmptyLineItemDraft()])

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

    setCreatedAtLocal(toDatetimeLocalValue(order.createdAt))
    setCreatedByValue(order.createdBy ?? "")
    setStatusUpdatedAtLocal(toDatetimeLocalValue(order.statusUpdatedAt))
    setStatusUpdatedByValue(order.statusUpdatedBy ?? "")
  }, [order])

  useEffect(() => {
    if (order || !initialValues) return
    setItems((prev) => {
      const first = prev[0] ?? createEmptyLineItemDraft()
      const patch: Partial<LineItemDraft> = {}
      if (initialValues.productId) patch.productId = initialValues.productId
      if (initialValues.optionValues) patch.optionValues = initialValues.optionValues
      if (initialValues.width) patch.width = initialValues.width
      if (initialValues.height) patch.height = initialValues.height
      if (initialValues.dimensionUnit) patch.dimensionUnit = initialValues.dimensionUnit
      if (initialValues.stickerWidth) patch.stickerWidth = initialValues.stickerWidth
      if (initialValues.stickerHeight) patch.stickerHeight = initialValues.stickerHeight
      if (initialValues.stickerUnit) patch.stickerUnit = initialValues.stickerUnit
      if (initialValues.isCustomSize) patch.isCustomSize = true
      if (initialValues.customWidth) patch.customWidth = initialValues.customWidth
      if (initialValues.customHeight) patch.customHeight = initialValues.customHeight
      if (initialValues.customThickness) patch.customThickness = initialValues.customThickness
      if (initialValues.customBackToBack !== undefined) patch.customBackToBack = initialValues.customBackToBack
      return [{ ...first, ...patch }, ...prev.slice(1)]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, initialValues])

  const resolvedItems = items.map((draft) => {
    const product = products.find((candidate) => candidate.id === draft.productId) ?? null
    const isMissingProduct = !!order && !!draft.productId && !product
    const computed = computeLineItemPricing(draft, product)
    const frozenOriginal = isMissingProduct
      ? order?.items.find((candidate) => candidate.id === draft.originalItemId)
      : undefined
    const lineTotal = isMissingProduct ? (frozenOriginal?.lineTotal ?? 0) : computed.lineTotal
    return { draft, product, computed, isMissingProduct, frozenOriginal, lineTotal }
  })

  const subtotal = resolvedItems.reduce((sum, resolved) => sum + resolved.lineTotal, 0)
  const discountNum = Math.max(0, Number(discount) || 0)
  const additionalFeesNum = Math.max(0, Number(additionalFees) || 0)
  const layoutFeeNum = Math.max(0, Number(layoutFee) || 0)
  const shippingFeeNum = shippingEnabled ? Math.max(0, Number(shippingFee) || 0) : 0
  const previewTotal = Math.max(
    subtotal + additionalFeesNum + layoutFeeNum + shippingFeeNum - discountNum,
    0
  )

  // Only sent when the requester can edit these fields, and only the ones actually
  // changed — never overwrites createdAt with an empty/invalid value.
  function buildAdminMetadataChanges(): Partial<OrderAdminEditableFields> {
    if (!order || !canEditMetadata) return {}
    const changes: Partial<OrderAdminEditableFields> = {}

    const createdAtIso = fromDatetimeLocalValue(createdAtLocal)
    if (createdAtIso && createdAtIso !== order.createdAt) changes.createdAt = createdAtIso

    if (createdByValue !== (order.createdBy ?? "")) changes.createdBy = createdByValue || null

    const statusUpdatedAtIso = fromDatetimeLocalValue(statusUpdatedAtLocal)
    if (statusUpdatedAtIso !== order.statusUpdatedAt) changes.statusUpdatedAt = statusUpdatedAtIso

    if (statusUpdatedByValue !== (order.statusUpdatedBy ?? "")) {
      changes.statusUpdatedBy = statusUpdatedByValue || null
    }

    return changes
  }

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
    } else if (customerName.trim().length > 60) {
      nextErrors.customerName = "Must be 60 characters or fewer."
    }

    if (description.length > 20) {
      nextErrors.description = "Must be 20 characters or fewer."
    }

    if (!channel) {
      nextErrors.channel = "Order channel is required."
    }

    if (shippingEnabled) {
      const resolvedName = sameName ? customerName : shippingName
      const resolvedPhone = samePhone ? customerPhone : shippingPhone
      if (!resolvedName.trim() || !resolvedPhone.trim() || !shippingAddress.trim()) {
        nextErrors.shipping = "Name, phone, and address are required."
      } else if (resolvedName.trim().length > 60) {
        nextErrors.shipping = "Name must be 60 characters or fewer."
      } else if (shippingAddress.trim().length > 250) {
        nextErrors.shipping = "Address must be 250 characters or fewer."
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

    resolvedItems.forEach((resolved, index) => {
      if (resolved.isMissingProduct) return

      if (!resolved.product) {
        nextErrors[`item-${index}-product`] = "Select a product."
      } else if (resolved.product.status !== "Active") {
        nextErrors[`item-${index}-product`] =
          "This product is inactive and can't be used for new or updated orders."
      } else if (
        !resolved.computed.isManual &&
        !(resolved.product.category === "Sintra Board" && resolved.draft.isCustomSize)
      ) {
        const missingRequired = resolved.product.options.some(
          (option) => option.required && !resolved.draft.optionValues[option.id]
        )
        if (missingRequired) nextErrors[`item-${index}-options`] = "Select all required options."
      }

      if (resolved.product && !resolved.computed.pricing) {
        nextErrors[`item-${index}-pricing`] = "Complete the pricing fields for this product."
      }

      if (resolved.draft.notes.length > 60) {
        nextErrors[`item-${index}-notes`] = "Must be 60 characters or fewer."
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})

    setIsSubmitting(true)
    try {
      const builtItems: OrderItem[] = []
      for (const resolved of resolvedItems) {
        if (resolved.isMissingProduct) {
          if (resolved.frozenOriginal) builtItems.push(resolved.frozenOriginal)
          continue
        }
        if (!resolved.product) continue
        const item = buildOrderItem(resolved.draft, resolved.product, resolved.computed)
        if (item) builtItems.push(item)
      }

      const subtotalFinal = builtItems.reduce((sum, item) => sum + item.lineTotal, 0)
      const total = Math.max(
        subtotalFinal + additionalFeesNum + layoutFeeNum + shippingFeeNum - discountNum,
        0
      )

      if (order) {
        const firstCategory = builtItems[0]?.productCategory ?? order.items[0]?.productCategory
        const validStatuses = firstCategory ? getStatusFlowForCategory(firstCategory) : []
        const status = validStatuses.includes(order.status) ? order.status : "pending"
        await updateOrder(order.id, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          description: description.trim(),
          status,
          items: builtItems,
          subtotal: subtotalFinal,
          discount: discountNum,
          additionalFees: additionalFeesNum,
          layoutFee: layoutFeeNum,
          total,
          shippingAddress: resolveShippingAddress(),
          channel: channel as OrderChannel,
          payment: resolvePayment(total),
          ...buildAdminMetadataChanges(),
        })
        toast.success("Order updated.")
        navigate(`/orders/${order.id}`)
      } else {
        const created = await addOrder({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          description: description.trim(),
          status: "pending",
          items: builtItems,
          subtotal: subtotalFinal,
          discount: discountNum,
          additionalFees: additionalFeesNum,
          layoutFee: layoutFeeNum,
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
                    maxLength={60}
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
              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="order-description">Description</FieldLabel>
                <Input
                  id="order-description"
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value)
                    clearError("description")
                  }}
                  placeholder="Optional short description"
                  maxLength={20}
                  aria-invalid={!!errors.description}
                />
                <FieldError>{errors.description}</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {resolvedItems.map((resolved, index) => (
          <OrderLineItemCard
            key={resolved.draft.id}
            index={index}
            products={products}
            activeProducts={activeProducts}
            product={resolved.product}
            draft={resolved.draft}
            computed={resolved.computed}
            onChange={(next) => updateItemAt(index, next)}
            onRemove={items.length > 1 ? () => removeItemAt(index) : undefined}
            isMissingProduct={resolved.isMissingProduct}
            errors={{
              product: errors[`item-${index}-product`],
              options: errors[`item-${index}-options`],
              pricing: errors[`item-${index}-pricing`],
              notes: errors[`item-${index}-notes`],
            }}
            onClearError={(key: LineItemErrorKey) => clearError(`item-${index}-${key}`)}
          />
        ))}

        <Button type="button" variant="outline" size="sm" className="self-start" onClick={addItem}>
          <PlusIcon data-icon="inline-start" />
          Add another product
        </Button>

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

              <Field>
                <FieldLabel htmlFor="order-layout-fee">Layout Fee</FieldLabel>
                <Input
                  id="order-layout-fee"
                  type="number"
                  min={0}
                  step="0.01"
                  value={layoutFee}
                  onChange={(event) => setLayoutFee(event.target.value)}
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

        {canEditMetadata && (
          <Card>
            <CardHeader>
              <CardTitle>Order Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="order-created-at">Created Date</FieldLabel>
                    <Input
                      id="order-created-at"
                      type="datetime-local"
                      value={createdAtLocal}
                      onChange={(event) => setCreatedAtLocal(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="order-created-by">Created By</FieldLabel>
                    <Select
                      value={createdByValue}
                      onValueChange={(value) => setCreatedByValue(value as string)}
                    >
                      <SelectTrigger id="order-created-by" className="w-full">
                        <SelectValue placeholder="Select a user">
                          {(value: string | null) => {
                            const match = userOptions.find((u) => u.id === value)
                            return match ? `${match.firstName} ${match.lastName}` : "Select a user"
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {userOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="order-status-updated-at">Status Updated Date</FieldLabel>
                    <Input
                      id="order-status-updated-at"
                      type="datetime-local"
                      value={statusUpdatedAtLocal}
                      onChange={(event) => setStatusUpdatedAtLocal(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="order-status-updated-by">Status Updated By</FieldLabel>
                    <Select
                      value={statusUpdatedByValue}
                      onValueChange={(value) => setStatusUpdatedByValue(value as string)}
                    >
                      <SelectTrigger id="order-status-updated-by" className="w-full">
                        <SelectValue placeholder="Select a user">
                          {(value: string | null) => {
                            const match = userOptions.find((u) => u.id === value)
                            return match ? `${match.firstName} ${match.lastName}` : "Select a user"
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {userOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        )}

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
          items={resolvedItems.map((resolved) => ({
            product: resolved.product,
            optionValues: resolved.draft.optionValues,
            pricing: resolved.computed.pricing,
            quantity: Math.max(1, Math.round(Number(resolved.draft.quantity) || 1)),
            lineTotal: resolved.lineTotal,
            stickerQuotationResult: resolved.computed.quotationResult,
          }))}
          discount={discountNum}
          additionalFees={additionalFeesNum}
          layoutFee={layoutFeeNum}
          shippingFee={shippingFeeNum}
        />
      </div>
    </form>
  )
}
