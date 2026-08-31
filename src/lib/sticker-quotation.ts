import type { PricingEntry } from "@/lib/products"

export const STICKER_UNITS = ["in","cm", "mm", ] as const
export type StickerUnit = (typeof STICKER_UNITS)[number]

export type StickerPackageResult = { quantity: number; free: number }

export type StickerQuotation = {
  package300: StickerPackageResult
  package500: StickerPackageResult
  package1000: StickerPackageResult
}

export const PACKAGE_TIERS: { key: keyof StickerQuotation; price: number }[] = [
  { key: "package300", price: 300 },
  { key: "package500", price: 500 },
  { key: "package1000", price: 1000 },
]

export function nearestPackageTier(price: number): keyof StickerQuotation {
  return PACKAGE_TIERS.reduce((closest, tier) =>
    Math.abs(tier.price - price) < Math.abs(closest.price - price) ? tier : closest
  ).key
}

export function nearestCandidateForTier(
  tierPrice: number,
  candidates: PricingEntry[]
): PricingEntry | null {
  if (candidates.length === 0) return null
  return candidates.reduce((closest, candidate) =>
    Math.abs(candidate.price - tierPrice) < Math.abs(closest.price - tierPrice) ? candidate : closest
  )
}

const FREE_RATE_BY_TIER: Record<keyof StickerQuotation, number> = {
  package300: 0.085,
  package500: 0.1,
  package1000: 0.25,
}

/** Scales a per-package pcs/free result up by order quantity — e.g. 100 pcs + 5 pcs free × 5 = 500 + 25. */
export function scaleQuotation<T extends { quantity: number; free?: number }>(
  result: T,
  multiplier: number
): T {
  return {
    ...result,
    quantity: result.quantity * multiplier,
    free: result.free !== undefined ? result.free * multiplier : result.free,
  }
}

export function calculateStickerPackageResult(
  width: number,
  height: number,
  unit: StickerUnit,
  price: number
): StickerPackageResult {
  let area = convertToInches(width, unit) * convertToInches(height, unit)
  if (area < 1) area = 1

  const quantity = roundDownToFive((4 * price) / area)
  const freeRate = FREE_RATE_BY_TIER[nearestPackageTier(price)]
  return { quantity, free: roundDownToFive(quantity * freeRate) }
}

export function convertToInches(value: number, unit: StickerUnit): number {
  if (unit === "cm") return value / 2.54
  if (unit === "mm") return value / 25.4
  return value
}

function roundDownToFive(value: number): number {
  return Math.floor(value / 5) * 5
}

export function calculateStickerQuotation(
  width: number,
  height: number,
  unit: StickerUnit
): StickerQuotation {
  let area = convertToInches(width, unit) * convertToInches(height, unit)
  if (area < 1) area = 1

  const package300 = roundDownToFive((4 * 300) / area)
  const package500 = roundDownToFive((4 * 500) / area)
  const package1000 = roundDownToFive((4 * 1000) / area)

  return {
    package300: { quantity: package300, free: roundDownToFive(package300 * 0.085) },
    package500: { quantity: package500, free: roundDownToFive(package500 * 0.1) },
    package1000: { quantity: package1000, free: roundDownToFive(package1000 * 0.25) },
  }
}
