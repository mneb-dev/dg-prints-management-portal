export const STICKER_UNITS = ["in","cm", "mm", ] as const
export type StickerUnit = (typeof STICKER_UNITS)[number]

export type StickerPackageResult = { quantity: number; free: number }

/** Free-bonus-pieces rate per package tier, keyed by the ordinal number embedded in a
 *  PricingEntry's packageName (see parsePackageNumber). Extend this as new package tiers are
 *  introduced — an unparseable or not-yet-defined package number falls back to 0% (see
 *  freeRateForPackageName) rather than guessing. */
const FREE_RATE_BY_PACKAGE_NUMBER: Record<number, number> = {
  1: 0.085,
  2: 0.1,
  3: 0.25,
}

/** Extracts the ordinal package number from a packageName like "P1", "Package 2", "Pkg 3". */
export function parsePackageNumber(packageName: string | undefined): number | null {
  const match = packageName?.match(/\d+/)
  return match ? Number(match[0]) : null
}

export function freeRateForPackageName(packageName: string | undefined): number {
  const num = parsePackageNumber(packageName)
  return num !== null ? (FREE_RATE_BY_PACKAGE_NUMBER[num] ?? 0) : 0
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
  price: number,
  packageName: string | undefined
): StickerPackageResult {
  let area = convertToInches(width, unit) * convertToInches(height, unit)

  if (area < 1) area = 1

  const quantity = roundDownToFive((4 * price) / area)
  return { quantity, free: roundDownToFive(quantity * freeRateForPackageName(packageName)) }
}

export function convertToInches(value: number, unit: StickerUnit): number {
  if (unit === "cm") return value / 2.54
  if (unit === "mm") return value / 25.4
  return value
}

function roundDownToFive(value: number): number {
  return Math.floor(value / 5) * 5
}
