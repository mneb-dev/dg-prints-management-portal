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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth"
import { convertToFeet, type LengthUnit } from "@/lib/length-units"
import { canEditOrderMetadata, getStatusFlowForCategory, useOrderActions } from "@/lib/orders"
import type {
  Order,
  OrderAdminEditableFields,
  OrderChannel,
  OrderItem,
  OrderItemPricing,
  Payment,
  PaymentMethod,
  SelectedOption,
} from "@/lib/orders"
import {
  CARD_SELECTABLE_PACKAGE_CATEGORIES,
  computeLineTotal,
  isManualPricingProduct,
  resolvePricing,
} from "@/lib/pricing-resolver"
import { ALL_VARIANTS, useProductCatalog, type PricingEntry, type Product } from "@/lib/products"
import { useUserOptions } from "@/lib/users"
import { calculateLaminatedStickerQuotation } from "@/lib/laminated-sticker-quotation"
import {
  calculateSintraCustomPrice,
  describeSintraCustom,
  parseSintraCustomDescription,
  type SintraThickness,
} from "@/lib/sintra-board-pricing"
import { calculateStickerQuotation, nearestPackageTier, type StickerUnit } from "@/lib/sticker-quotation"
import { generateId } from "@/lib/utils"

import { LaminatedStickerQuotationFields } from "./laminated-sticker-quotation-fields"
import { OrderSummaryPanel } from "./order-summary-panel"
import { PaymentFields } from "./payment-fields"
import { PricingFields, type SizeUnit } from "./pricing-fields"
import { ProductOptionsFields } from "./product-options-fields"
import { ShippingAddressFields } from "./shipping-address-fields"
import { SintraBoardCustomFields } from "./sintra-board-custom-fields"
import { StickerQuotationFields } from "./sticker-quotation-fields"

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

// For Sticker Label / Laminated Sticker products, the option named "Package" is the one
// that drives pricing tier selection — it's replaced by clickable quotation cards instead
// of a dropdown, so it's looked up by this naming convention rather than rendered generically.
function findPackageOption(product: Product) {
  return product.options.find((option) => option.name.trim().toLowerCase() === "package") ?? null
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
  const [stickerUnit, setStickerUnit] = useState<StickerUnit>("in")
  const [isCustomSize, setIsCustomSize] = useState(false)
  const [customWidth, setCustomWidth] = useState("")
  const [customHeight, setCustomHeight] = useState("")
  const [customThickness, setCustomThickness] = useState<SintraThickness>("3mm")
  const [customBackToBack, setCustomBackToBack] = useState(false)
  const [notes, setNotes] = useState("")
  const [description, setDescription] = useState("")
  const [manualProductName, setManualProductName] = useState("")
  const [manualUnitPrice, setManualUnitPrice] = useState("")
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

  const existingItem = order?.items[0] ?? null
  const selectedProduct = products.find((product) => product.id === productId) ?? null
  const isEditingMissingProduct = !!order && !!existingItem && !selectedProduct
  const activeProducts = products.filter((product) => product.status === "Active")

  const isCardSelectablePackage =
    !!selectedProduct && CARD_SELECTABLE_PACKAGE_CATEGORIES.includes(selectedProduct.category)
  const packageOption =
    selectedProduct && isCardSelectablePackage ? findPackageOption(selectedProduct) : null
  const packageCandidates: PricingEntry[] =
    selectedProduct && isCardSelectablePackage
      ? selectedProduct.pricing.filter((entry) => entry.pricingType === "Package")
      : []

  // A package option with a single possible value has nothing to click — auto-select it so
  // the required-option validation is satisfied without a dropdown or a no-op click target.
  useEffect(() => {
    if (!packageOption || packageOption.values.length !== 1) return
    const onlyValue = packageOption.values[0]
    if (optionValues[packageOption.id] === onlyValue) return
    setOptionValues((prev) => ({ ...prev, [packageOption.id]: onlyValue }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageOption?.id, packageOption?.values.length])

  useEffect(() => {
    if (!order) return
    const item = order.items[0]
    if (!item) return

    setCustomerName(order.customerName)
    setCustomerPhone(order.customerPhone)
    setDescription(order.description ?? "")
    setProductId(item.productId)
    setOptionValues(
      Object.fromEntries(item.selectedOptions.map((option) => [option.optionId, option.value]))
    )
    setQuantity(String(item.quantity))
    setNotes(item.notes)
    setDiscount(String(order.discount))
    setAdditionalFees(String(order.additionalFees))
    setLayoutFee(String(order.layoutFee))

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
    } else if (item.pricing.pricingType === "Custom") {
      // thickness/back-to-back aren't stored as structured data (the backend
      // whitelists a fixed set of pricing keys) — recovered from the folded
      // packageName description instead. See sintra-board-pricing.ts.
      setIsCustomSize(true)
      setCustomWidth(String(item.pricing.width))
      setCustomHeight(String(item.pricing.height))
      const parsed = parseSintraCustomDescription(item.pricing.packageName)
      setCustomThickness(parsed.thickness)
      setCustomBackToBack(parsed.backToBack)
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

    setCreatedAtLocal(toDatetimeLocalValue(order.createdAt))
    setCreatedByValue(order.createdBy ?? "")
    setStatusUpdatedAtLocal(toDatetimeLocalValue(order.statusUpdatedAt))
    setStatusUpdatedByValue(order.statusUpdatedBy ?? "")
  }, [order])

  useEffect(() => {
    if (order || !initialValues) return
    if (initialValues.productId) setProductId(initialValues.productId)
    if (initialValues.optionValues) setOptionValues(initialValues.optionValues)
    if (initialValues.width) setWidth(initialValues.width)
    if (initialValues.height) setHeight(initialValues.height)
    if (initialValues.dimensionUnit) setDimensionUnit(initialValues.dimensionUnit)
    if (initialValues.stickerWidth) setStickerWidth(initialValues.stickerWidth)
    if (initialValues.stickerHeight) setStickerHeight(initialValues.stickerHeight)
    if (initialValues.stickerUnit) setStickerUnit(initialValues.stickerUnit)
    if (initialValues.isCustomSize) setIsCustomSize(true)
    if (initialValues.customWidth) setCustomWidth(initialValues.customWidth)
    if (initialValues.customHeight) setCustomHeight(initialValues.customHeight)
    if (initialValues.customThickness) setCustomThickness(initialValues.customThickness)
    if (initialValues.customBackToBack !== undefined) setCustomBackToBack(initialValues.customBackToBack)
  }, [order, initialValues])

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
    if (productId) {
      // Only reset sticker size when switching away from a previously selected product —
      // preserves a size carried over from the calculator on the first product pick.
      setStickerWidth("")
      setStickerHeight("")
      setStickerUnit("in")
    }
    setIsCustomSize(false)
    setCustomWidth("")
    setCustomHeight("")
    setCustomThickness("3mm")
    setCustomBackToBack(false)
    clearError("product")
    clearError("options")
    clearError("pricing")
  }

  function handleCustomSizeToggle(value: boolean) {
    setIsCustomSize(value)
    if (value) setOptionValues({})
    clearError("pricing")
    clearError("options")
  }

  function handleCustomWidthChange(value: string) {
    setCustomWidth(value)
    clearError("pricing")
  }

  function handleCustomHeightChange(value: string) {
    setCustomHeight(value)
    clearError("pricing")
  }

  function handleCustomThicknessChange(value: SintraThickness) {
    setCustomThickness(value)
    clearError("pricing")
  }

  function handleCustomBackToBackChange(value: boolean) {
    setCustomBackToBack(value)
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

  // Selecting a quotation card for a card-selectable (Sticker Label / Laminated Sticker)
  // product writes into optionValues — the value resolvePricing()/buildPricing() actually
  // read — since these products drive pricing off a "Package" product option, not a
  // multi-candidate PricingEntry list.
  function handleSelectPackageOption(entry: PricingEntry) {
    if (!packageOption) return
    const value = entry.appliesTo === ALL_VARIANTS ? (packageOption.values[0] ?? entry.appliesTo) : entry.appliesTo
    setOptionValues((prev) => ({ ...prev, [packageOption.id]: value }))
    clearError("options")
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
      : resolution.kind === "auto" && resolution.entry.pricingType === "Package"
        ? resolution.entry
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

    if (selectedProduct.category === "Sintra Board" && isCustomSize) {
      const w = Number(customWidth)
      const h = Number(customHeight)
      if (!(w > 0) || !(h > 0)) return null
      return {
        pricingType: "Custom",
        unitPrice: calculateSintraCustomPrice({
          width: w,
          height: h,
          thickness: customThickness,
          backToBack: customBackToBack,
        }),
        unit: "in",
        width: w,
        height: h,
        packageName: describeSintraCustom(customThickness, customBackToBack),
      }
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
  const layoutFeeNum = Math.max(0, Number(layoutFee) || 0)
  const shippingFeeNum = shippingEnabled ? Math.max(0, Number(shippingFee) || 0) : 0
  const previewTotal = isEditingMissingProduct
    ? Math.max((existingItem?.lineTotal ?? 0) + additionalFeesNum + layoutFeeNum + shippingFeeNum - discountNum, 0)
    : Math.max(previewLineTotal + additionalFeesNum + layoutFeeNum + shippingFeeNum - discountNum, 0)

  const stickerQuotationPackage =
    selectedProduct?.category === "Sticker Label" ? selectedStickerPackage : null
  const isLaminatedSticker = selectedProduct?.category === "Laminated Sticker"

  const stickerWidthNum = Number(stickerWidth)
  const stickerHeightNum = Number(stickerHeight)
  const hasValidStickerSize = stickerWidthNum > 0 && stickerHeightNum > 0
  const stickerQuotation = hasValidStickerSize
    ? calculateStickerQuotation(stickerWidthNum, stickerHeightNum, stickerUnit)
    : null
  const stickerQuotationResult =
    stickerQuotationPackage && stickerQuotation ? stickerQuotation[stickerQuotationPackage] : null

  const laminatedStickerPrice = selectedPackagePricingEntry?.price ?? null
  const laminatedStickerQuantity =
    isLaminatedSticker && hasValidStickerSize && laminatedStickerPrice && laminatedStickerPrice > 0
      ? calculateLaminatedStickerQuotation(
          stickerWidthNum,
          stickerHeightNum,
          stickerUnit,
          laminatedStickerPrice
        )
      : null
  const laminatedStickerQuotationResult =
    laminatedStickerQuantity !== null ? { quantity: laminatedStickerQuantity } : null

  const stickerQuotationSnapshot =
    stickerQuotationPackage && stickerQuotationResult
      ? {
          package: stickerQuotationPackage,
          width: stickerWidthNum,
          height: stickerHeightNum,
          unit: stickerUnit,
          ...stickerQuotationResult,
        }
      : laminatedStickerQuotationResult
        ? {
            package: selectedPackagePricingEntry?.packageName ?? null,
            width: stickerWidthNum,
            height: stickerHeightNum,
            unit: stickerUnit,
            ...laminatedStickerQuotationResult,
          }
        : null

  const quotationResult = stickerQuotationResult ?? laminatedStickerQuotationResult

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
      } else if (!isManual && !(selectedProduct.category === "Sintra Board" && isCustomSize)) {
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
          existingItem.lineTotal + additionalFeesNum + layoutFeeNum + shippingFeeNum - discountNum,
          0
        )
        await updateOrder(order.id, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          description: description.trim(),
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
      const total = Math.max(subtotal + additionalFeesNum + layoutFeeNum + shippingFeeNum - discountNum, 0)

      if (order) {
        const validStatuses = getStatusFlowForCategory(item.productCategory)
        const status = validStatuses.includes(order.status) ? order.status : "pending"
        await updateOrder(order.id, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          description: description.trim(),
          status,
          items: [item],
          subtotal,
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
          items: [item],
          subtotal,
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
                  {!(selectedProduct.category === "Sintra Board" && isCustomSize) && (
                    <>
                      <ProductOptionsFields
                        product={selectedProduct}
                        values={optionValues}
                        onChange={(optionId, value) => {
                          setOptionValues((prev) => ({ ...prev, [optionId]: value }))
                          clearError("options")
                        }}
                        excludeOptionIds={packageOption ? [packageOption.id] : undefined}
                      />
                      <FieldError>{errors.options}</FieldError>
                    </>
                  )}
                  {selectedProduct.category === "Sintra Board" && (
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Switch
                        checked={isCustomSize}
                        onCheckedChange={(checked) => handleCustomSizeToggle(!!checked)}
                      />
                      Custom size
                    </label>
                  )}
                  {selectedProduct.category === "Sintra Board" && isCustomSize ? (
                    <SintraBoardCustomFields
                      width={customWidth}
                      onWidthChange={handleCustomWidthChange}
                      height={customHeight}
                      onHeightChange={handleCustomHeightChange}
                      thickness={customThickness}
                      onThicknessChange={handleCustomThicknessChange}
                      backToBack={customBackToBack}
                      onBackToBackChange={handleCustomBackToBackChange}
                      quantity={quantity}
                      onQuantityChange={handleQuantityChange}
                    />
                  ) : (
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
                      hidePackageSelector={isCardSelectablePackage}
                      hideQuantity={isCardSelectablePackage}
                    />
                  )}
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
                  candidates={packageCandidates}
                  onSelectPackage={(entryId) => {
                    const entry = packageCandidates.find((candidate) => candidate.id === entryId)
                    if (entry) handleSelectPackageOption(entry)
                  }}
                  selectable
                  selectedEntryId={selectedPackagePricingEntry?.id ?? null}
                  quantity={quantity}
                  onQuantityChange={handleQuantityChange}
                />
              )}

              {selectedProduct && !isEditingMissingProduct && isLaminatedSticker && (
                <LaminatedStickerQuotationFields
                  width={stickerWidth}
                  onWidthChange={setStickerWidth}
                  height={stickerHeight}
                  onHeightChange={setStickerHeight}
                  unit={stickerUnit}
                  onUnitChange={setStickerUnit}
                  candidates={packageCandidates}
                  selectedEntryId={selectedPackagePricingEntry?.id ?? null}
                  onSelectPackage={(entryId) => {
                    const entry = packageCandidates.find((candidate) => candidate.id === entryId)
                    if (entry) handleSelectPackageOption(entry)
                  }}
                  showAmount
                  quantity={quantity}
                  onQuantityChange={handleQuantityChange}
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
          product={isEditingMissingProduct ? null : selectedProduct}
          optionValues={optionValues}
          pricing={isEditingMissingProduct ? null : previewPricing}
          quantity={quantityNum}
          lineTotal={isEditingMissingProduct ? (existingItem?.lineTotal ?? 0) : previewLineTotal}
          discount={discountNum}
          additionalFees={additionalFeesNum}
          layoutFee={layoutFeeNum}
          shippingFee={shippingFeeNum}
          stickerQuotationResult={isEditingMissingProduct ? null : quotationResult}
        />
      </div>
    </form>
  )
}
