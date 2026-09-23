import { useEffect, useMemo, useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import {
  CircleAlertIcon,
  CopyIcon,
  ExternalLinkIcon,
  PlusIcon,
  SettingsIcon,
  TagIcon,
  TruckIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card"
import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteIcon,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompletePopup,
  AutocompletePrimitive,
} from "@/components/ui/autocomplete"
import { CurrencyInput } from "@/components/ui/currency-input"
import { CharCount } from "@/components/char-count"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth"
import { useCategories } from "@/lib/categories"
import { SPX_ADMIN_CREATE_ORDER_URL, copyToClipboard } from "@/lib/clipboard"
import type { LengthUnit } from "@/lib/length-units"
import { useNavGuard } from "@/lib/nav-guard"
import {
  type OrderDraft,
  type OrderDraftFields,
  useOrderDrafts,
} from "@/lib/order-drafts"
import {
  buildOrderItem,
  computeLineItemPricing,
  createEmptyLineItemDraft,
  draftFromOrderItem,
  isStickerLabelCategory,
  type LineItemDraft,
} from "@/lib/order-line-item"
import {
  canEditOrderMetadata,
  getStatusFlowForCategory,
  useCustomerRankings,
  useHotProductIds,
  useOrderActions,
} from "@/lib/orders"
import type {
  Order,
  OrderAdminEditableFields,
  OrderChannel,
  OrderItem,
  Payment,
  PaymentMethod,
} from "@/lib/orders"
import { useProductCatalog } from "@/lib/products"
import { useSettings } from "@/lib/settings"
import type { SintraThickness } from "@/lib/sintra-board-pricing"
import type { StickerUnit } from "@/lib/sticker-quotation"
import { useUserOptions } from "@/lib/users"
import { cn, formatCurrency } from "@/lib/utils"
import {
  isValidPhMobileNumber,
  LAYOUT_BY_REQUIRED_MESSAGE,
  maxLengthMessage,
  NOTES_REQUIRED_WHEN_FEES_MESSAGE,
  PHONE_FORMAT_MESSAGE,
  PRICING_INCOMPLETE_MESSAGE,
  PRODUCT_INACTIVE_MESSAGE,
  REQUIRED_OPTIONS_MESSAGE,
  requiredMessage,
  validatePaymentAmount,
} from "@/lib/validation"

import { DiscardOrderChangesDialog } from "./discard-order-changes-dialog"
import { OrderFormSectionNav, type OrderFormSection } from "./order-form-section-nav"
import { OrderLineItemCard, type LineItemErrorKey } from "./order-line-item-card"
import { OrderSummaryPanel } from "./order-summary-panel"
import { PaymentFields } from "./payment-fields"
import { SaveOrderDraftDialog } from "./save-order-draft-dialog"
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

// Admin metadata override for a `datetime-local`-shaped value ("YYYY-MM-DDTHH:mm"): a themed
// Calendar popover for the date part plus a native time input for the time-of-day part.
function DateTimeField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const datePart = value.slice(0, 10)
  const timePart = value.slice(11, 16)

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          render={
            <Button variant="outline" size="sm" className="flex-1 justify-start font-normal" />
          }
        >
          {datePart ? format(parseISO(datePart), "MMM d, yyyy") : "Select date"}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={datePart ? parseISO(datePart) : undefined}
            onSelect={(date) =>
              onChange(date ? `${format(date, "yyyy-MM-dd")}T${timePart || "00:00"}` : "")
            }
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={timePart}
        onChange={(event) => datePart && onChange(`${datePart}T${event.target.value}`)}
        disabled={disabled || !datePart}
        className="w-28"
      />
    </div>
  )
}

// Line items get a fresh generateId() every time an empty draft is created, so comparing raw
// LineItemDraft objects would flag an untouched create-mode form as "dirty" from the first render.
// Identity fields carry no user-visible content, so they're excluded from dirty comparisons.
function stripItemIdentity({ id: _id, originalItemId: _originalItemId, ...rest }: LineItemDraft) {
  return rest
}

function toComparableFields(fields: OrderDraftFields) {
  return { ...fields, items: fields.items.map(stripItemIdentity) }
}

// Pure mirror of the order-seeding effect below — used to build the edit-mode dirty baseline.
function fieldsFromOrder(order: Order): OrderDraftFields {
  const shipping = order.shippingAddress
  const paid = order.payment.status !== "unpaid"
  return {
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    items: order.items.length > 0 ? order.items.map(draftFromOrderItem) : [createEmptyLineItemDraft()],
    discount: String(order.discount),
    additionalFees: String(order.additionalFees),
    notes: order.notes ?? "",
    layoutFee: String(order.layoutFee),
    layoutBy: order.layoutBy ?? "",
    shippingEnabled: !!shipping,
    sameName: shipping ? shipping.name === order.customerName : false,
    samePhone: false,
    shippingName: shipping?.name ?? "",
    shippingPhone: shipping?.phone ?? "",
    shippingAddress: shipping?.address ?? "",
    shippingFee: shipping ? String(shipping.fee ?? 0) : "0",
    channel: order.channel,
    markPaid: paid,
    paymentStatus:
      order.payment.status === "refunded"
        ? "refunded"
        : paid && order.payment.status !== "paid"
          ? "partially_paid"
          : "paid",
    paymentMethod: paid ? (order.payment.method ?? "") : "",
    downPayment: paid ? String(order.payment.downPayment) : "",
  }
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

/** Line item enter/exit animation length — kept in step with the wrapper's `duration-300`. */
const ITEM_EXIT_MS = 300

/** Muted "*" for a field whose requirement currently applies (e.g. Layout by once there's a
 * layout fee) — shown conditionally, so nothing looks required when it isn't. */
function RequiredMark() {
  return (
    <>
      <span aria-hidden className="-ml-1 text-destructive/70">
        *
      </span>
      <span className="sr-only">(required)</span>
    </>
  )
}

const SECTION_ORDER = [
  "order-section-customer",
  "order-section-products",
  "order-section-shipping",
  "order-section-pricing",
  "order-section-payment",
] as const

/** Error keys in on-page order: by section, then as validation produced them within it. */
function orderErrorKeys(keys: string[]): string[] {
  return [...keys].sort(
    (a, b) => SECTION_ORDER.indexOf(sectionForErrorKey(a)) - SECTION_ORDER.indexOf(sectionForErrorKey(b))
  )
}

/** Which form section a validation error key belongs to (see handleSubmit's nextErrors keys). */
function sectionForErrorKey(key: string): (typeof SECTION_ORDER)[number] {
  if (key.startsWith("item-")) return "order-section-products"
  if (key.startsWith("shipping")) return "order-section-shipping"
  if (key === "customerName" || key === "customerPhone") return "order-section-customer"
  if (key === "layoutBy" || key === "notes") return "order-section-pricing"
  return "order-section-payment"
}

export function OrderForm({
  order,
  initialValues,
  draftToLoad,
}: {
  order: Order | null
  initialValues?: OrderFormSeed
  draftToLoad?: OrderDraft | null
}) {
  const navigate = useNavigate()
  const { products } = useProductCatalog()
  const { hotProductIds: hotProductIdList } = useHotProductIds()
  const hotProductIds = useMemo(() => new Set(hotProductIdList), [hotProductIdList])
  const {
    customerNames,
    topCustomerNames,
    customerDetailsByName,
    windowDays: customerWindowDays,
  } = useCustomerRankings()
  const { addOrder, updateOrder } = useOrderActions()
  const { categories } = useCategories()
  const { settings } = useSettings()
  const { role } = useAuth()
  const canEditMetadata = !!order && canEditOrderMetadata(role)
  // Unconditionally enabled (unlike the admin-only Created By/Status Updated By fields below,
  // which reuse this same list) since Layout By is a normal field any role can set.
  const { users: userOptions } = useUserOptions(true)
  const { setGuard } = useNavGuard()
  const { saveDraft, deleteDraft } = useOrderDrafts()

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [items, setItems] = useState<LineItemDraft[]>([createEmptyLineItemDraft()])
  // Which line-item cards render expanded vs collapsed to a summary row — mirrors the same
  // "single item starts open, multiple start collapsed" rule the read-only order details page
  // uses (see order-item-summary.tsx / order-details-page.tsx).
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(
    () => new Set(items.length === 1 ? items.map((item) => item.id) : [])
  )
  // Items mid exit-animation (still rendered, fading out) and items added via "Add another item"
  // (the only ones that play the enter animation — not items present on load or from a draft).
  const [removingItemIds, setRemovingItemIds] = useState<Set<string>>(() => new Set())
  const addedItemIdsRef = useRef<Set<string>>(new Set())
  const [discount, setDiscount] = useState("0")
  const [additionalFees, setAdditionalFees] = useState("0")
  const [notes, setNotes] = useState("")
  const [layoutFee, setLayoutFee] = useState("0")
  const [layoutBy, setLayoutBy] = useState("")
  const [shippingEnabled, setShippingEnabled] = useState(false)
  // Off by default: the recipient is often someone other than the customer, so the name is typed
  // in unless the user opts in (or the data shows it matches — see the cases below).
  const [sameName, setSameName] = useState(false)
  const [samePhone, setSamePhone] = useState(false)
  const [shippingName, setShippingName] = useState("")
  const [shippingPhone, setShippingPhone] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [shippingFee, setShippingFee] = useState("0")
  const [channel, setChannel] = useState<OrderChannel | "">("")
  const [markPaid, setMarkPaid] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partially_paid" | "refunded">("paid")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [downPayment, setDownPayment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [createdAtLocal, setCreatedAtLocal] = useState("")
  const [createdByValue, setCreatedByValue] = useState("")
  const [statusUpdatedAtLocal, setStatusUpdatedAtLocal] = useState("")
  const [statusUpdatedByValue, setStatusUpdatedByValue] = useState("")

  // "Same as customer"/"Same as shipping" can only take effect once there's something to copy —
  // an empty source value falls back to the dependent field being editable, regardless of the
  // toggle's last recorded state. Used for both the UI (via the props below) and the payload.
  const effectiveSameName = sameName && !!customerName.trim()
  const effectiveSamePhone = samePhone && shippingEnabled && !!shippingPhone.trim()
  const resolvedCustomerPhone = effectiveSamePhone ? shippingPhone : customerPhone

  function buildCurrentFields(): OrderDraftFields {
    return {
      customerName,
      customerPhone,
      items,
      discount,
      additionalFees,
      notes,
      layoutFee,
      layoutBy,
      shippingEnabled,
      sameName,
      samePhone,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingFee,
      channel,
      markPaid,
      paymentStatus,
      paymentMethod,
      downPayment,
    }
  }

  const [pendingNav, setPendingNav] = useState<string | number | null>(null)
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null)
  const [baselineFields, setBaselineFields] = useState<OrderDraftFields>(() => buildCurrentFields())

  const isDirty =
    JSON.stringify(toComparableFields(buildCurrentFields())) !==
    JSON.stringify(toComparableFields(baselineFields))

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

  // Picking a suggested customer loads their last-known contact/shipping info, overwriting
  // whatever is currently in Phone/shipping fields — same "picking resets dependent fields"
  // convention as picking a product elsewhere in this form.
  function applyCustomerSelection(name: string) {
    const details = customerDetailsByName.get(name)
    if (!details) return
    setCustomerPhone(details.customerPhone)
    if (details.shippingAddress) {
      setShippingEnabled(true)
      setSameName(details.shippingAddress.name.trim() === name.trim())
      setShippingName(details.shippingAddress.name)
      setSamePhone(false)
      setShippingPhone(details.shippingAddress.phone)
      setShippingAddress(details.shippingAddress.address)
      setShippingFee(resolvedDefaultShippingFee)
    }
  }

  const activeProducts = products
    .filter((product) => product.status === "Active")
    .sort((a, b) => Number(hotProductIds.has(b.id)) - Number(hotProductIds.has(a.id)))

  const activeUserOptions = userOptions.filter((user) => user.status === "active")

  function updateItemAt(index: number, next: LineItemDraft) {
    setItems((prev) => prev.map((draft, i) => (i === index ? next : draft)))
  }

  function addItem() {
    const next = createEmptyLineItemDraft()
    addedItemIdsRef.current.add(next.id)
    setItems((prev) => [...prev, next])
    // A freshly-added item is empty, so it always starts expanded regardless of how many
    // other items are already collapsed.
    setOpenItemIds((prev) => new Set(prev).add(next.id))
    // Bring the new card into view once its enter animation has settled, so the user lands on it
    // instead of having to scroll down to find it.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.setTimeout(
      () =>
        document
          .querySelector(`[data-item-id="${next.id}"]`)
          ?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "nearest" }),
      prefersReducedMotion ? 0 : ITEM_EXIT_MS
    )
  }

  // Removal plays an exit animation first (card fades/scales out while its height and the gap
  // below it collapse), then drops the item once it's finished. Reduced motion removes at once.
  function removeItemById(id: string) {
    if (removingItemIds.has(id)) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    setRemovingItemIds((prev) => new Set(prev).add(id))
    window.setTimeout(
      () => {
        setItems((prev) => (prev.length > 1 ? prev.filter((draft) => draft.id !== id) : prev))
        clearAllItemErrors()
        setRemovingItemIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      },
      prefersReducedMotion ? 0 : ITEM_EXIT_MS
    )
  }

  useEffect(() => {
    if (!order) return
    setCustomerName(order.customerName)
    setCustomerPhone(order.customerPhone)
    setDiscount(String(order.discount))
    setAdditionalFees(String(order.additionalFees))
    setNotes(order.notes ?? "")
    setLayoutFee(String(order.layoutFee))
    setLayoutBy(order.layoutBy ?? "")
    const loadedItems =
      order.items.length > 0 ? order.items.map(draftFromOrderItem) : [createEmptyLineItemDraft()]
    setItems(loadedItems)
    setOpenItemIds(new Set(loadedItems.length === 1 ? loadedItems.map((item) => item.id) : []))

    if (order.shippingAddress) {
      setShippingEnabled(true)
      setSameName(order.shippingAddress.name === order.customerName)
      setSamePhone(false)
      setShippingName(order.shippingAddress.name)
      setShippingPhone(order.shippingAddress.phone)
      setShippingAddress(order.shippingAddress.address)
      setShippingFee(String(order.shippingAddress.fee ?? 0))
    }

    setChannel(order.channel)
    if (order.payment.status !== "unpaid") {
      setMarkPaid(true)
      setPaymentStatus(
        order.payment.status === "paid"
          ? "paid"
          : order.payment.status === "refunded"
            ? "refunded"
            : "partially_paid"
      )
      setPaymentMethod(order.payment.method ?? "")
      setDownPayment(String(order.payment.downPayment))
    }

    setCreatedAtLocal(toDatetimeLocalValue(order.createdAt))
    setCreatedByValue(order.createdBy ?? "")
    setStatusUpdatedAtLocal(toDatetimeLocalValue(order.statusUpdatedAt))
    setStatusUpdatedByValue(order.statusUpdatedBy ?? "")
  }, [order])

  // Resets the edit-mode dirty baseline whenever a (new) order finishes loading, so unsaved-changes
  // tracking compares against the order's actual saved state rather than the empty create-mode default.
  useEffect(() => {
    if (!order) return
    setBaselineFields(fieldsFromOrder(order))
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

  // Loading a saved draft is a later, deliberate user action (a "Load" click), so it's seeded in
  // its own effect placed after the calculator-handoff seed above and always wins over it.
  useEffect(() => {
    if (order || !draftToLoad) return
    const f = draftToLoad.fields
    setCustomerName(f.customerName)
    setCustomerPhone(f.customerPhone)
    setItems(f.items)
    setOpenItemIds(new Set(f.items.length === 1 ? f.items.map((item) => item.id) : []))
    setDiscount(f.discount)
    setAdditionalFees(f.additionalFees)
    setNotes(f.notes)
    setLayoutFee(f.layoutFee)
    setLayoutBy(f.layoutBy)
    setShippingEnabled(f.shippingEnabled)
    setSameName(f.sameName)
    setSamePhone(f.samePhone)
    setShippingName(f.shippingName)
    setShippingPhone(f.shippingPhone)
    setShippingAddress(f.shippingAddress)
    setShippingFee(f.shippingFee)
    setChannel(f.channel)
    setMarkPaid(f.markPaid)
    setPaymentStatus(f.paymentStatus)
    setPaymentMethod(f.paymentMethod)
    setDownPayment(f.downPayment)
    setLoadedDraftId(draftToLoad.id)
    // The loaded draft becomes the new "nothing to save" baseline — only edits made after loading
    // it should count as dirty, since the draft itself already reflects this content.
    setBaselineFields(f)
  }, [order, draftToLoad])

  // Registers this form with the shared nav-guard so sidebar clicks can intercept navigation while
  // there are unsaved changes; the app uses a plain BrowserRouter, so there's no useBlocker to lean on.
  useEffect(() => {
    setGuard(isDirty ? (targetPath: string) => setPendingNav(targetPath) : null)
    return () => setGuard(null)
  }, [isDirty, setGuard])

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
  // A typed name that matches a known customer (case-sensitive, same lookup the suggestion pick
  // uses) — drives the "Returning customer · N orders" hint under the name field.
  const returningCustomer = customerDetailsByName.get(customerName.trim()) ?? null
  const stickerLabelSubtotal = resolvedItems.reduce((sum, resolved) => {
    const category = resolved.product?.category ?? resolved.frozenOriginal?.productCategory
    return isStickerLabelCategory(category) ? sum + resolved.lineTotal : sum
  }, 0)
  const freeShippingEligible = stickerLabelSubtotal >= 1000
  // The fee to auto-fill whenever shipping gets turned on (by the toggle or by picking a
  // customer) — always derived fresh from this order's contents, never from history.
  const resolvedDefaultShippingFee = String(freeShippingEligible ? 0 : Math.max(0, settings.shippingFee))
  const discountNum = Math.max(0, Number(discount) || 0)
  const additionalFeesNum = Math.max(0, Number(additionalFees) || 0)
  const layoutFeeNum = Math.max(0, Number(layoutFee) || 0)
  const shippingFeeNum = shippingEnabled ? Math.max(0, Number(shippingFee) || 0) : 0
  const previewTotal = Math.max(
    subtotal + additionalFeesNum + layoutFeeNum + shippingFeeNum - discountNum,
    0
  )

  // Keep the shipping fee in sync with the sticker-label promo threshold as line items change —
  // zero it out the moment the order crosses ≥1000, and revert to the configured default the
  // moment it drops back below. Staff can still type a different value afterward; this only
  // reacts to the threshold actually being crossed (in either direction), not every render.
  const wasFreeShippingEligible = useRef(freeShippingEligible)
  useEffect(() => {
    if (shippingEnabled && freeShippingEligible !== wasFreeShippingEligible.current) {
      setShippingFee(resolvedDefaultShippingFee)
    }
    wasFreeShippingEligible.current = freeShippingEligible
  }, [freeShippingEligible, shippingEnabled, resolvedDefaultShippingFee])

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
      name: (effectiveSameName ? customerName : shippingName).trim(),
      phone: shippingPhone.trim(),
      address: shippingAddress.trim(),
      fee: shippingFeeNum,
    }
  }

  function handleOpenSpx() {
    window.open(SPX_ADMIN_CREATE_ORDER_URL, "_blank", "noopener,noreferrer")
  }

  function handleCopyShippingAddress() {
    const shipping = resolveShippingAddress()
    if (!shipping) return
    copyToClipboard(`${shipping.name}\n${shipping.phone}\n${shipping.address}`)
  }

  function resolvePayment(total: number): Payment {
    if (!markPaid) return { status: "unpaid", method: null, downPayment: 0, balance: total }
    if (paymentStatus === "refunded") return { status: "refunded", method: null, downPayment: 0, balance: 0 }
    const method = channel === "Shopee" ? "Bank Transfer" : (paymentMethod as PaymentMethod)
    if (paymentStatus === "paid") {
      return { status: "paid", method, downPayment: total, balance: 0 }
    }
    const dp = Number(downPayment) || 0
    return { status: "partially_paid", method, downPayment: dp, balance: Math.max(total - dp, 0) }
  }

  /** Scrolls to and focuses the field behind an error key (opening its item card first if it's
   * collapsed). Falls back to the first focusable control in the section when the field has no
   * aria-invalid control of its own (e.g. the channel toggle group). */
  function focusErrorField(key: string) {
    const itemMatch = /^item-(\d+)-/.exec(key)
    const itemId = itemMatch ? items[Number(itemMatch[1])]?.id : undefined
    if (itemId) setOpenItemIds((prev) => (prev.has(itemId) ? prev : new Set(prev).add(itemId)))

    requestAnimationFrame(() => {
      const container = itemMatch
        ? document.querySelector<HTMLElement>(`[data-line-item="${itemMatch[1]}"]`)
        : document.getElementById(sectionForErrorKey(key))
      if (!container) return
      const target =
        container.querySelector<HTMLElement>('[aria-invalid="true"]') ??
        container.querySelector<HTMLElement>("input:not([disabled]), button:not([disabled]), [tabindex='0']")
      container.scrollIntoView({ behavior: "smooth", block: "start" })
      target?.focus({ preventScroll: true })
    })
  }

  // Phone format is checked as soon as the field is left, so a typo shows up while the user is
  // still there — not only after pressing save. An empty or now-valid value clears it.
  function validatePhoneOnBlur(key: "customerPhone" | "shippingPhone", value: string) {
    const trimmed = value.trim()
    if (trimmed && !isValidPhMobileNumber(trimmed)) {
      setErrors((prev) => ({ ...prev, [key]: PHONE_FORMAT_MESSAGE }))
    } else if (errors[key] === PHONE_FORMAT_MESSAGE) {
      clearError(key)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}

    if (!customerName.trim()) {
      nextErrors.customerName = requiredMessage("Customer name")
    } else if (customerName.trim().length > 60) {
      nextErrors.customerName = maxLengthMessage("Customer name", 60)
    }

    if (resolvedCustomerPhone.trim() && !isValidPhMobileNumber(resolvedCustomerPhone.trim())) {
      nextErrors.customerPhone = PHONE_FORMAT_MESSAGE
    }

    if (notes.length > 20) {
      nextErrors.notes = maxLengthMessage("Notes", 20)
    } else if (additionalFeesNum > 0 && !notes.trim()) {
      nextErrors.notes = NOTES_REQUIRED_WHEN_FEES_MESSAGE
    }

    if (layoutFeeNum > 0 && !layoutBy) {
      nextErrors.layoutBy = LAYOUT_BY_REQUIRED_MESSAGE
    }

    if (!channel) {
      nextErrors.channel = requiredMessage("Order channel")
    }

    if (shippingEnabled) {
      const resolvedName = effectiveSameName ? customerName : shippingName

      if (!resolvedName.trim()) {
        nextErrors.shippingName = requiredMessage("Recipient name")
      } else if (resolvedName.trim().length > 60) {
        nextErrors.shippingName = maxLengthMessage("Recipient name", 60)
      }

      if (!shippingPhone.trim()) {
        nextErrors.shippingPhone = requiredMessage("Recipient phone")
      } else if (!isValidPhMobileNumber(shippingPhone.trim())) {
        nextErrors.shippingPhone = PHONE_FORMAT_MESSAGE
      }

      if (!shippingAddress.trim()) {
        nextErrors.shippingAddress = requiredMessage("Address")
      } else if (shippingAddress.trim().length > 250) {
        nextErrors.shippingAddress = maxLengthMessage("Address", 250)
      }
    }

    if (markPaid && paymentStatus !== "refunded") {
      const effectiveMethod = channel === "Shopee" ? "Bank Transfer" : paymentMethod
      const paymentErrors = validatePaymentAmount({
        effectiveMethod,
        downPaymentInput: downPayment,
        targetStatus: paymentStatus === "partially_paid" ? "partially_paid" : "paid",
        total: previewTotal,
      })
      if (paymentErrors.method) nextErrors.paymentMethod = paymentErrors.method
      if (paymentErrors.downPayment) nextErrors.downPayment = paymentErrors.downPayment
    }

    resolvedItems.forEach((resolved, index) => {
      if (resolved.isMissingProduct) return

      if (!resolved.product) {
        nextErrors[`item-${index}-product`] = requiredMessage("Product")
      } else if (resolved.product.status !== "Active") {
        nextErrors[`item-${index}-product`] = PRODUCT_INACTIVE_MESSAGE
      } else if (
        !resolved.computed.isManual &&
        !(resolved.product.category === "Sintra" && resolved.draft.isCustomSize)
      ) {
        const missingRequired = resolved.product.options.some(
          (option) => option.required && !resolved.draft.optionValues[option.id]
        )
        if (missingRequired) nextErrors[`item-${index}-options`] = REQUIRED_OPTIONS_MESSAGE
      }

      if (resolved.product && !resolved.computed.pricing) {
        nextErrors[`item-${index}-pricing`] = PRICING_INCOMPLETE_MESSAGE
      }

      if (resolved.draft.notes.length > 60) {
        nextErrors[`item-${index}-notes`] = maxLengthMessage("Notes", 60)
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      // A collapsed item's error is invisible until its card reopens — expand every item
      // that failed validation so the errors below are actually visible.
      const erroredItemIds = new Set(
        Object.keys(nextErrors)
          .filter((key) => key.startsWith("item-"))
          .map((key) => items[Number(key.split("-")[1])]?.id)
          .filter((itemId): itemId is string => !!itemId)
      )
      if (erroredItemIds.size > 0) {
        setOpenItemIds((prev) => new Set([...prev, ...erroredItemIds]))
      }
      // Take the user straight to the first problem (scroll + focus), after the frame that
      // expands any collapsed items so the field is actually there.
      const [firstErrorKey] = orderErrorKeys(Object.keys(nextErrors))
      if (firstErrorKey) focusErrorField(firstErrorKey)
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
        const validStatuses = firstCategory ? getStatusFlowForCategory(firstCategory, categories) : []
        const status = validStatuses.includes(order.status) ? order.status : "pending"
        await updateOrder(order.id, {
          customerName: customerName.trim(),
          customerPhone: resolvedCustomerPhone.trim(),
          status,
          items: builtItems,
          subtotal: subtotalFinal,
          discount: discountNum,
          additionalFees: additionalFeesNum,
          layoutFee: layoutFeeNum,
          layoutBy: layoutBy || null,
          total,
          notes: notes.trim(),
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
          customerPhone: resolvedCustomerPhone.trim(),
          status: "pending",
          items: builtItems,
          subtotal: subtotalFinal,
          discount: discountNum,
          additionalFees: additionalFeesNum,
          layoutFee: layoutFeeNum,
          layoutBy: layoutBy || null,
          total,
          notes: notes.trim(),
          shippingAddress: resolveShippingAddress(),
          channel: channel as OrderChannel,
          payment: resolvePayment(total),
        })
        toast.success("Order created.")
        if (loadedDraftId) deleteDraft(loadedDraftId)
        navigate(`/orders/${created.id}`)
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save order.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function confirmNavigation() {
    if (pendingNav === null) return
    // react-router's navigate() is overloaded on `To | number`, which TS can't dispatch from a
    // union argument directly — narrowing per-branch resolves to the matching overload.
    if (typeof pendingNav === "number") navigate(pendingNav)
    else navigate(pendingNav)
    setPendingNav(null)
  }

  function confirmSaveDraftAndLeave() {
    saveDraft(buildCurrentFields(), loadedDraftId ?? undefined)
    confirmNavigation()
  }

  const submitLabel = isSubmitting ? "Saving…" : order ? "Save changes" : "Create order"

  function handleCancel() {
    if (isDirty) setPendingNav(-1)
    else navigate(-1)
  }

  // Progress markers for the section nav — derived from the values already in state and the
  // current validation errors; no extra validation.
  const errorKeys = Object.keys(errors)
  const orderedErrorKeys = orderErrorKeys(errorKeys)
  const hasErrorIn = (section: string) => errorKeys.some((key) => sectionForErrorKey(key) === section)
  const shippingComplete =
    shippingEnabled &&
    !!(effectiveSameName ? customerName : shippingName).trim() &&
    !!shippingPhone.trim() &&
    !!shippingAddress.trim()
  const productsComplete = resolvedItems.every(
    (resolved) => resolved.isMissingProduct || (!!resolved.product && resolved.lineTotal > 0)
  )

  const sections: OrderFormSection[] = [
    {
      id: "order-section-customer",
      label: "Customer",
      state: hasErrorIn("order-section-customer") ? "error" : customerName.trim() ? "complete" : undefined,
    },
    {
      id: "order-section-products",
      label: "Products",
      state: hasErrorIn("order-section-products") ? "error" : productsComplete ? "complete" : undefined,
    },
    {
      id: "order-section-shipping",
      label: "Shipping",
      state: hasErrorIn("order-section-shipping")
        ? "error"
        : !shippingEnabled
          ? "optional"
          : shippingComplete
            ? "complete"
            : undefined,
    },
    {
      id: "order-section-pricing",
      label: "Fees & discount",
      state: hasErrorIn("order-section-pricing") ? "error" : "complete",
    },
    {
      id: "order-section-payment",
      label: "Payment",
      state: hasErrorIn("order-section-payment") ? "error" : channel ? "complete" : undefined,
    },
    ...(canEditMetadata ? [{ id: "order-section-metadata", label: "Metadata" }] : []),
  ]

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <Card id="order-section-customer" className="scroll-mt-24">
          <CardHeader>
            <OrderFormSectionHeader icon={UserIcon} title="Customer" description="Who the order is for" />
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.customerName}>
                  <FieldLabel htmlFor="order-customer-name">Customer Name</FieldLabel>
                  <Autocomplete
                    items={customerNames}
                    value={customerName}
                    openOnInputClick
                    onValueChange={(text, eventDetails) => {
                      setCustomerName(text)
                      clearError("customerName")
                      if (eventDetails.reason === "item-press") applyCustomerSelection(text)
                    }}
                  >
                    <AutocompleteInputGroup>
                      <AutocompleteInput
                        id="order-customer-name"
                        className="w-full"
                        placeholder="Fullname"
                        maxLength={60}
                        aria-invalid={!!errors.customerName}
                      />
                      <AutocompleteIcon />
                    </AutocompleteInputGroup>
                    <AutocompletePopup>
                      <AutocompleteEmpty>No matching customers — this will be added as a new customer.</AutocompleteEmpty>
                      <AutocompletePrimitive.List>
                        {(name: string) => (
                          <AutocompleteItem key={name} value={name}>
                            <span className="flex flex-1 items-center gap-1.5">
                              {name}
                              {topCustomerNames.has(name) && (
                                <Badge variant="secondary" className="h-4 gap-1 px-1.5 text-[10px]">
                                  <span aria-hidden className="size-1.5 rounded-full bg-order-status-gold" />
                                  Top
                                </Badge>
                              )}
                            </span>
                          </AutocompleteItem>
                        )}
                      </AutocompletePrimitive.List>
                    </AutocompletePopup>
                  </Autocomplete>
                  {errors.customerName ? (
                    <FieldError>{errors.customerName}</FieldError>
                  ) : customerName.trim() ? (
                    <FieldDescription
                      key={returningCustomer ? "returning" : "new"}
                      className="flex animate-in items-center gap-1.5 text-xs duration-200 fade-in-0 motion-reduce:animate-none"
                    >
                      {returningCustomer ? (
                        <>
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-order-status-teal" />
                          <span>
                            Returning customer · {returningCustomer.orderCount}{" "}
                            {returningCustomer.orderCount === 1 ? "order" : "orders"} ·{" "}
                            {formatCurrency(returningCustomer.totalSpent)}
                            {customerWindowDays ? ` in the last ${customerWindowDays} days` : ""}
                          </span>
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                          <span>New customer</span>
                        </>
                      )}
                    </FieldDescription>
                  ) : null}
                </Field>
                <Field
                  className={effectiveSamePhone ? "opacity-70" : undefined}
                  data-invalid={!!errors.customerPhone}
                >
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="order-customer-phone">Phone</FieldLabel>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        size="sm"
                        checked={effectiveSamePhone}
                        disabled={!shippingEnabled || !shippingPhone.trim()}
                        onCheckedChange={(checked) => setSamePhone(!!checked)}
                      />
                      Same as shipping
                    </label>
                  </div>
                  <Input
                    id="order-customer-phone"
                    value={effectiveSamePhone ? shippingPhone : customerPhone}
                    onChange={(event) => {
                      setCustomerPhone(event.target.value)
                      clearError("customerPhone")
                    }}
                    onBlur={() => validatePhoneOnBlur("customerPhone", customerPhone)}
                    inputMode="tel"
                    disabled={effectiveSamePhone}
                    placeholder="09XX XXX XXXX"
                    aria-invalid={!!errors.customerPhone}
                  />
                  <FieldError>{errors.customerPhone}</FieldError>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {resolvedItems.map((resolved, index) => {
          const itemId = resolved.draft.id
          const isRemoving = removingItemIds.has(itemId)
          return (
          // Exit: grid-rows 1fr→0fr collapses the height, -mb-4 closes the parent's gap-4, while
          // the card fades and scales down. Enter (added items only): fade + slide down into place.
          <div
            key={itemId}
            data-line-item={index}
            data-item-id={itemId}
            inert={isRemoving}
            aria-hidden={isRemoving || undefined}
            className={cn(
              "grid transition-[grid-template-rows,opacity,scale,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              isRemoving ? "pointer-events-none -mb-4 grid-rows-[0fr] scale-[0.98] opacity-0" : "grid-rows-[1fr]",
              addedItemIdsRef.current.has(itemId) &&
                "animate-in fade-in-0 slide-in-from-top-2 zoom-in-[0.98] duration-300 motion-reduce:animate-none"
            )}
          >
          <div className={cn("min-h-0", isRemoving && "overflow-hidden")}>
          <OrderLineItemCard
            id={index === 0 ? "order-section-products" : undefined}
            index={index}
            products={products}
            activeProducts={activeProducts}
            hotProductIds={hotProductIds}
            product={resolved.product}
            draft={resolved.draft}
            computed={resolved.computed}
            onChange={(next) => updateItemAt(index, next)}
            onRemove={items.length - removingItemIds.size > 1 ? () => removeItemById(itemId) : undefined}
            isMissingProduct={resolved.isMissingProduct}
            errors={{
              product: errors[`item-${index}-product`],
              options: errors[`item-${index}-options`],
              pricing: errors[`item-${index}-pricing`],
              notes: errors[`item-${index}-notes`],
            }}
            onClearError={(key: LineItemErrorKey) => clearError(`item-${index}-${key}`)}
            isOpen={openItemIds.has(resolved.draft.id)}
            onOpenChange={(open) =>
              setOpenItemIds((prev) => {
                const next = new Set(prev)
                if (open) next.add(resolved.draft.id)
                else next.delete(resolved.draft.id)
                return next
              })
            }
            canCollapse={!!resolved.product}
          />
          </div>
          </div>
          )
        })}

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full border-dashed text-muted-foreground hover:border-primary/40 hover:text-foreground"
          onClick={addItem}
        >
          <PlusIcon data-icon="inline-start" />
          Add another item
        </Button>

        <Card id="order-section-shipping" className="scroll-mt-24">
          <CardHeader>
            <OrderFormSectionHeader
              icon={TruckIcon}
              title="Shipping"
              description="Optional — only for delivered orders"
            />
            {shippingEnabled && (
              <CardAction className="flex gap-1">
            
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Copy shipping address"
                  onClick={handleCopyShippingAddress}
                >
                  <CopyIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Open SPX order form"
                  onClick={handleOpenSpx}
                >
                  <ExternalLinkIcon />
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <ShippingAddressFields
              enabled={shippingEnabled}
              onEnabledChange={(value) => {
                setShippingEnabled(value)
                // Prefill the first time shipping is turned on for this order — an untouched
                // "0" means the field hasn't been edited yet.
                if (value && shippingFee === "0") {
                  setShippingFee(resolvedDefaultShippingFee)
                }
                clearError("shippingName")
                clearError("shippingPhone")
                clearError("shippingAddress")
              }}
              customerName={customerName}
              sameName={effectiveSameName}
              onSameNameChange={setSameName}
              name={shippingName}
              onNameChange={(value) => {
                setShippingName(value)
                clearError("shippingName")
              }}
              phone={shippingPhone}
              onPhoneChange={(value) => {
                setShippingPhone(value)
                clearError("shippingPhone")
              }}
              onPhoneBlur={() => validatePhoneOnBlur("shippingPhone", shippingPhone)}
              address={shippingAddress}
              onAddressChange={(value) => {
                setShippingAddress(value)
                clearError("shippingAddress")
              }}
              fee={shippingFee}
              onFeeChange={setShippingFee}
              freeShippingEligible={freeShippingEligible}
              stickerLabelSubtotal={stickerLabelSubtotal}
              errors={{
                name: errors.shippingName,
                phone: errors.shippingPhone,
                address: errors.shippingAddress,
              }}
            />
          </CardContent>
        </Card>

        <Card id="order-section-pricing" className="scroll-mt-24">
          <CardHeader>
            <OrderFormSectionHeader
              icon={TagIcon}
              title="Fees & discount"
              description="Layout fee, extra fees and discount"
            />
          </CardHeader>
          <CardContent>
            {/* Three clear pairs: extra fees + why, layout fee + who, then discount. A field's "*"
                appears only once its rule actually applies (fee > ₱0), so nothing looks required
                that isn't. */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="order-additional-fees">Additional fees</FieldLabel>
                  <CurrencyInput
                    id="order-additional-fees"
                    value={additionalFees}
                    onChange={(event) => setAdditionalFees(event.target.value)}
                  />
                </Field>

                <Field data-invalid={!!errors.notes}>
                  <div className="flex items-baseline justify-between gap-2">
                    <FieldLabel htmlFor="order-notes">
                      Fee note
                      {additionalFeesNum > 0 && <RequiredMark />}
                    </FieldLabel>
                    <CharCount value={notes} max={20} />
                  </div>
                  <Input
                    id="order-notes"
                    value={notes}
                    onChange={(event) => {
                      setNotes(event.target.value)
                      clearError("notes")
                    }}
                    placeholder="e.g. Rush fee"
                    maxLength={20}
                    aria-invalid={!!errors.notes}
                  />
                  {errors.notes ? (
                    <FieldError>{errors.notes}</FieldError>
                  ) : (
                    <FieldDescription className="text-xs">
                      Why the extra fee — required when fees are above ₱0.
                    </FieldDescription>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="order-layout-fee">Layout fee</FieldLabel>
                  <CurrencyInput
                    id="order-layout-fee"
                    value={layoutFee}
                    onChange={(event) => {
                      setLayoutFee(event.target.value)
                      clearError("layoutBy")
                    }}
                  />
                </Field>

                <Field data-invalid={!!errors.layoutBy}>
                  <FieldLabel htmlFor="order-layout-by">
                    Layout by
                    {layoutFeeNum > 0 && <RequiredMark />}
                  </FieldLabel>
                  <Select
                    value={layoutBy}
                    onValueChange={(value) => {
                      setLayoutBy(value as string)
                      clearError("layoutBy")
                    }}
                  >
                    <SelectTrigger
                      id="order-layout-by"
                      className="w-full"
                      aria-invalid={!!errors.layoutBy}
                    >
                      <SelectValue placeholder="Select a user">
                        {(value: string | null) => {
                          const match = userOptions.find((u) => u.id === value)
                          return match ? `${match.firstName} ${match.lastName}` : "Select a user"
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {activeUserOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.layoutBy}</FieldError>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="order-discount">Discount</FieldLabel>
                  <CurrencyInput
                    id="order-discount"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                  />
                  {discountNum > 0 && subtotal > 0 && (
                    <FieldDescription
                      className={cn(
                        "animate-in text-xs duration-200 fade-in-0 motion-reduce:animate-none",
                        discountNum > subtotal && "text-order-status-gold"
                      )}
                    >
                      {discountNum > subtotal
                        ? "More than the items' subtotal."
                        : `≈ ${Math.round((discountNum / subtotal) * 100)}% of the items' subtotal.`}
                    </FieldDescription>
                  )}
                </Field>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="order-section-payment" className="scroll-mt-24">
          <CardHeader>
            <OrderFormSectionHeader icon={WalletIcon} title="Payment" description="Channel and how much is paid" />
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
              allowRefunded={!!order}
              errors={{
                channel: errors.channel,
                paymentMethod: errors.paymentMethod,
                downPayment: errors.downPayment,
              }}
            />
          </CardContent>
        </Card>

        {canEditMetadata && (
          <Card id="order-section-metadata" className="scroll-mt-24">
            <CardHeader>
              <OrderFormSectionHeader
                icon={SettingsIcon}
                title="Order metadata"
                description="Admin-only record details"
              />
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="order-created-at">Created Date</FieldLabel>
                    <DateTimeField
                      id="order-created-at"
                      value={createdAtLocal}
                      onChange={setCreatedAtLocal}
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
                        {activeUserOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="order-status-updated-at">Status Updated Date</FieldLabel>
                    <DateTimeField
                      id="order-status-updated-at"
                      value={statusUpdatedAtLocal}
                      onChange={setStatusUpdatedAtLocal}
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
                        {activeUserOptions.map((u) => (
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

        {/* Desktop keeps these in the sticky summary panel; below lg the summary isn't sticky. */}
        <div className="flex justify-end gap-2 lg:hidden">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <OrderFormSectionNav sections={sections} />
        <OrderSummaryPanel
          items={resolvedItems.map((resolved) => ({
            product: resolved.product,
            optionValues: resolved.draft.optionValues,
            pricing: resolved.computed.pricing,
            quantity: Math.max(1, Math.round(Number(resolved.draft.quantity) || 1)),
            lineTotal: resolved.lineTotal,
            stickerQuotation: resolved.computed.stickerQuotationSnapshot,
            notes: resolved.draft.notes,
          }))}
          discount={discountNum}
          additionalFees={additionalFeesNum}
          layoutFee={layoutFeeNum}
          shippingFee={shippingFeeNum}
          notes={notes}
          footer={
            <div className="hidden flex-col gap-2 lg:flex">
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {submitLabel}
              </Button>
              {orderedErrorKeys.length > 0 && (
                <button
                  type="button"
                  onClick={() => focusErrorField(orderedErrorKeys[0])}
                  className="flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium text-destructive outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <CircleAlertIcon aria-hidden className="size-3.5" />
                  {orderedErrorKeys.length === 1 ? "1 issue to fix" : `${orderedErrorKeys.length} issues to fix`} — show
                  first
                </button>
              )}
              <Button type="button" variant="ghost" className="w-full" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          }
        />
      </div>

      {order ? (
        <DiscardOrderChangesDialog
          open={pendingNav !== null}
          onOpenChange={(open) => !open && setPendingNav(null)}
          onDiscard={confirmNavigation}
        />
      ) : (
        <SaveOrderDraftDialog
          open={pendingNav !== null}
          onOpenChange={(open) => !open && setPendingNav(null)}
          onDiscard={confirmNavigation}
          onSaveDraft={confirmSaveDraftAndLeave}
        />
      )}
    </form>
  )
}
