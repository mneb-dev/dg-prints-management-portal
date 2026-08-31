import { convertToInches, type StickerUnit } from "./sticker-quotation"

export function calculateLaminatedStickerQuotation(
  width: number,
  height: number,
  unit: StickerUnit,
  price: number
): number {
  let area = convertToInches(width, unit) * convertToInches(height, unit)
  if (area < 1) area = 1
  if (price <= 0) return 0

  const result = (area / 4) * (price / 100)
  const totalQuantity = price / result
  return Math.floor(totalQuantity)
}
