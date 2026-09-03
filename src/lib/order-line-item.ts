import { convertToFeet, type LengthUnit } from "@/lib/length-units"
import { calculateLaminatedStickerQuotation } from "@/lib/laminated-sticker-quotation"
import type { OrderItem, OrderItemPricing } from "@/lib/orders-slice"
import {
  CARD_SELECTABLE_PACKAGE_CATEGORIES,
  computeLineTotal,
  describeAppliesTo,
  isManualPricingProduct,
  isPackageOptionName,
  packageCandidatesForSelection,
  previewPackageCandidates,
  resolvePricingPreview,
  valueForOption,
  type PricingResolution,
} from "@/lib/pricing-resolver"
import type { PricingEntry, Product, ProductOption } from "@/lib/products"
import {
  calculateSintraCustomPrice,
  describeSintraCustom,
  parseSintraCustomDescription,
  type SintraThickness,
} from "@/lib/sintra-board-pricing"
import { calculateStickerPackageResult, type StickerUnit } from "@/lib/sticker-quotation"
import { generateId } from "@/lib/utils"

export type SizeUnit = "in" | "cm"

export type LineItemDraft = {
  id: string
  originalItemId?: string
  productId: string
  optionValues: Record<string, string>
  packageEntryId: string
  width: string
  height: string
  sizeUnit: SizeUnit
  dimensionUnit: LengthUnit
  quantity: string
  stickerWidth: string
  stickerHeight: string
  stickerUnit: StickerUnit
  isCustomSize: boolean
  customWidth: string
  customHeight: string
  customThickness: SintraThickness
  customBackToBack: boolean
  manualProductName: string
  manualUnitPrice: string
  notes: string
}

export function createEmptyLineItemDraft(): LineItemDraft {
  return {
    id: generateId(),
    productId: "",
    optionValues: {},
    packageEntryId: "",
    width: "",
    height: "",
    sizeUnit: "in",
    dimensionUnit: "ft",
    quantity: "1",
    stickerWidth: "",
    stickerHeight: "",
    stickerUnit: "in",
    isCustomSize: false,
    customWidth: "",
    customHeight: "",
    customThickness: "3mm",
    customBackToBack: false,
    manualProductName: "",
    manualUnitPrice: "",
    notes: "",
  }
}

// Mirrors the previous single-item `handleProductChange` — resets everything that's
// specific to the previously selected product when switching to a new one, but keeps the
// item's identity (`id`/`originalItemId`) intact.
export function resetDraftForProduct(draft: LineItemDraft, productId: string): LineItemDraft {
  return {
    ...draft,
    productId,
    optionValues: {},
    packageEntryId: "",
    width: "",
    height: "",
    sizeUnit: "in",
    dimensionUnit: "ft",
    quantity: "1",
    // Only reset sticker size when switching away from a previously selected product —
    // preserves a size carried over from the calculator on the first product pick.
    stickerWidth: draft.productId ? "" : draft.stickerWidth,
    stickerHeight: draft.productId ? "" : draft.stickerHeight,
    stickerUnit: draft.productId ? "in" : draft.stickerUnit,
    isCustomSize: false,
    customWidth: "",
    customHeight: "",
    customThickness: "3mm",
    customBackToBack: false,
    manualProductName: "",
    manualUnitPrice: "",
  }
}

export function draftFromOrderItem(item: OrderItem): LineItemDraft {
  const draft = createEmptyLineItemDraft()
  draft.id = item.id
  draft.originalItemId = item.id
  draft.productId = item.productId
  draft.optionValues = Object.fromEntries(
    item.selectedOptions.map((option) => [option.optionId, option.value])
  )
  draft.quantity = String(item.quantity)
  draft.notes = item.notes

  if (item.pricing.pricingType === "Package") {
    draft.packageEntryId = item.pricing.pricingEntryId
    if (item.pricing.size) {
      draft.width = String(item.pricing.size.width)
      draft.height = String(item.pricing.size.height)
      draft.sizeUnit = item.pricing.size.unit
    }
  } else if (item.pricing.pricingType === "Per Unit") {
    if (item.pricing.width && item.pricing.height) {
      draft.width = String(item.pricing.width)
      draft.height = String(item.pricing.height)
    }
  } else if (item.pricing.pricingType === "Manual") {
    draft.manualProductName = item.pricing.productName
    draft.manualUnitPrice = String(item.pricing.unitPrice)
  } else if (item.pricing.pricingType === "Custom") {
    // thickness/back-to-back aren't stored as structured data (the backend whitelists a
    // fixed set of pricing keys) — recovered from the folded packageName description
    // instead. See sintra-board-pricing.ts.
    draft.isCustomSize = true
    draft.customWidth = String(item.pricing.width)
    draft.customHeight = String(item.pricing.height)
    const parsed = parseSintraCustomDescription(item.pricing.packageName)
    draft.customThickness = parsed.thickness
    draft.customBackToBack = parsed.backToBack
  }

  if (item.stickerQuotation) {
    draft.stickerWidth = String(item.stickerQuotation.width)
    draft.stickerHeight = String(item.stickerQuotation.height)
    draft.stickerUnit = item.stickerQuotation.unit
  }

  return draft
}

export type LineItemComputed = {
  isManual: boolean
  resolution: PricingResolution
  isCardSelectablePackage: boolean
  packageOption: ProductOption | null
  packageCandidates: PricingEntry[]
  selectedPackagePricingEntry: PricingEntry | null
  selectedPackageCandidateId: string | null
  isLaminatedSticker: boolean
  quotationResult: { quantity: number; free?: number } | null
  stickerQuotationSnapshot: OrderItem["stickerQuotation"]
  pricing: OrderItemPricing | null
  lineTotal: number
}

// For Sticker Label / Laminated Sticker products, the option named "Package" is the one
// that drives pricing tier selection — it's replaced by clickable quotation cards instead
// of a dropdown, so it's looked up by this naming convention rather than rendered generically.
function findPackageOption(product: Product) {
  return product.options.find((option) => isPackageOptionName(option.name)) ?? null
}

/**
 * Pure per-item pricing derivation — no React hooks, safe to call once per item on every
 * render (including inside a `.map()`). Mirrors what used to be inline state derivation in
 * OrderForm when it only ever handled a single item.
 */
export function computeLineItemPricing(draft: LineItemDraft, product: Product | null): LineItemComputed {
  const isManual = product ? isManualPricingProduct(product) : false
  const resolution: PricingResolution =
    product && !isManual ? resolvePricingPreview(product, draft.optionValues) : { kind: "none" }

  const isCardSelectablePackage =
    !!product && CARD_SELECTABLE_PACKAGE_CATEGORIES.includes(product.category)
  const packageOption = product && isCardSelectablePackage ? findPackageOption(product) : null
  const packageCandidates: PricingEntry[] =
    product && isCardSelectablePackage && packageOption
      ? (() => {
          const exact = packageCandidatesForSelection(product, packageOption.id, draft.optionValues)
          return exact.length > 0 ? exact : previewPackageCandidates(product, packageOption.id)
        })()
      : []

  const selectedPackagePricingEntry =
    resolution.kind === "package"
      ? (resolution.candidates.find((candidate) => candidate.id === draft.packageEntryId) ?? null)
      : resolution.kind === "auto" && resolution.entry.pricingType === "Package"
        ? resolution.entry
        : null
  const selectedPackageValue = packageOption ? draft.optionValues[packageOption.id] : undefined
  const selectedPackageCandidateId =
    selectedPackagePricingEntry?.id ??
    (packageOption && selectedPackageValue
      ? (packageCandidates.find(
          (candidate) => valueForOption(candidate.appliesTo, packageOption.id) === selectedPackageValue
        )?.id ?? null)
      : null)
  const isStickerLabel = product?.category === "Sticker Label"
  const isLaminatedSticker = product?.category === "Laminated Sticker"

  const stickerWidthNum = Number(draft.stickerWidth)
  const stickerHeightNum = Number(draft.stickerHeight)
  const hasValidStickerSize = stickerWidthNum > 0 && stickerHeightNum > 0
  const stickerQuotationResult =
    isStickerLabel && hasValidStickerSize && selectedPackagePricingEntry
      ? calculateStickerPackageResult(
          stickerWidthNum,
          stickerHeightNum,
          draft.stickerUnit,
          selectedPackagePricingEntry.price,
          selectedPackagePricingEntry.packageName
        )
      : null

  const laminatedStickerPrice = selectedPackagePricingEntry?.price ?? null
  const laminatedStickerQuantity =
    isLaminatedSticker && hasValidStickerSize && laminatedStickerPrice && laminatedStickerPrice > 0
      ? calculateLaminatedStickerQuotation(
          stickerWidthNum,
          stickerHeightNum,
          draft.stickerUnit,
          laminatedStickerPrice
        )
      : null
  const laminatedStickerQuotationResult =
    laminatedStickerQuantity !== null ? { quantity: laminatedStickerQuantity } : null

  const stickerQuotationSnapshot: OrderItem["stickerQuotation"] =
    isStickerLabel && stickerQuotationResult
      ? {
          package: selectedPackagePricingEntry?.packageName ?? null,
          width: stickerWidthNum,
          height: stickerHeightNum,
          unit: draft.stickerUnit,
          ...stickerQuotationResult,
        }
      : laminatedStickerQuotationResult
        ? {
            package: selectedPackagePricingEntry?.packageName ?? null,
            width: stickerWidthNum,
            height: stickerHeightNum,
            unit: draft.stickerUnit,
            ...laminatedStickerQuotationResult,
          }
        : null

  const quotationResult = stickerQuotationResult ?? laminatedStickerQuotationResult

  function buildPricing(): OrderItemPricing | null {
    if (!product) return null

    if (isManual) {
      const price = Number(draft.manualUnitPrice)
      if (!draft.manualProductName.trim() || !Number.isFinite(price) || price < 0) return null
      return { pricingType: "Manual", productName: draft.manualProductName.trim(), unitPrice: price }
    }

    if (product.category === "Sintra Board" && draft.isCustomSize) {
      const w = Number(draft.customWidth)
      const h = Number(draft.customHeight)
      if (!(w > 0) || !(h > 0)) return null
      return {
        pricingType: "Custom",
        unitPrice: calculateSintraCustomPrice({
          width: w,
          height: h,
          thickness: draft.customThickness,
          backToBack: draft.customBackToBack,
        }),
        unit: "in",
        width: w,
        height: h,
        packageName: describeSintraCustom(draft.customThickness, draft.customBackToBack),
      }
    }

    if (resolution.kind === "package") {
      const entry = resolution.candidates.find((candidate) => candidate.id === draft.packageEntryId)
      if (!entry) return null
      const w = Number(draft.width)
      const h = Number(draft.height)
      const size = w > 0 && h > 0 ? { width: w, height: h, unit: draft.sizeUnit } : undefined
      return {
        pricingType: "Package",
        pricingEntryId: entry.id,
        packageName: entry.packageName ?? describeAppliesTo(entry.appliesTo),
        unitPrice: entry.price,
        unit: entry.unit,
        size,
      }
    }

    if (resolution.kind === "auto") {
      const entry = resolution.entry
      if (entry.pricingType === "Package") {
        const w = Number(draft.width)
        const h = Number(draft.height)
        const size = w > 0 && h > 0 ? { width: w, height: h, unit: draft.sizeUnit } : undefined
        return {
          pricingType: "Package",
          pricingEntryId: entry.id,
          packageName: entry.packageName ?? describeAppliesTo(entry.appliesTo),
          unitPrice: entry.price,
          unit: entry.unit,
          size,
        }
      }
      if (entry.pricingType === "Per Unit") {
        if (entry.unit === "sq.ft.") {
          const w = convertToFeet(Number(draft.width), draft.dimensionUnit)
          const h = convertToFeet(Number(draft.height), draft.dimensionUnit)
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

  const pricing = buildPricing()
  const quantityNum = Math.max(1, Math.round(Number(draft.quantity) || 1))
  const lineTotal = pricing ? computeLineTotal({ pricing, quantity: quantityNum }) : 0

  return {
    isManual,
    resolution,
    isCardSelectablePackage,
    packageOption,
    packageCandidates,
    selectedPackagePricingEntry,
    selectedPackageCandidateId,
    isLaminatedSticker,
    quotationResult,
    stickerQuotationSnapshot,
    pricing,
    lineTotal,
  }
}

export function buildOrderItem(
  draft: LineItemDraft,
  product: Product,
  computed: LineItemComputed
): OrderItem | null {
  if (!computed.pricing) return null

  const quantity = Math.max(1, Math.round(Number(draft.quantity) || 1))
  const selectedOptions = Object.entries(draft.optionValues).map(([optionId, value]) => {
    const option = product.options.find((candidate) => candidate.id === optionId)
    return { optionId, optionName: option?.name ?? "", value }
  })

  return {
    id: draft.originalItemId ?? generateId(),
    productId: product.id,
    productName: product.name,
    productCategory: product.category,
    selectedOptions,
    quantity,
    notes: draft.notes.trim(),
    pricing: computed.pricing,
    lineTotal: computed.lineTotal,
    stickerQuotation: computed.stickerQuotationSnapshot,
  }
}
