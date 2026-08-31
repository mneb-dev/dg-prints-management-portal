export const SINTRA_THICKNESSES = ["3mm", "5mm"] as const
export type SintraThickness = (typeof SINTRA_THICKNESSES)[number]

function roundUpToTen(value: number): number {
  return Math.ceil(value / 10) * 10
}

export type SintraCustomPriceInput = {
  width: number
  height: number
  thickness: SintraThickness
  backToBack: boolean
}

export function calculateSintraCustomPrice({
  width,
  height,
  thickness,
  backToBack,
}: SintraCustomPriceInput): number {
  const area = width * height
  const result = area / 387.75
  const thicknessBase = roundUpToTen(thickness === "3mm" ? 500 : 650)
  const result2 = result * thicknessBase
  const result3 = backToBack ? (area / 97.11) * 80 : 0
  const total = roundUpToTen(result2 + result3)
  const smallBoardSurcharge = area <= 97.11 ? 50 : area <= 193.05 ? 30 : 0
  return total + smallBoardSurcharge
}

export function describeSintraCustom(thickness: SintraThickness, backToBack: boolean): string {
  return backToBack ? `${thickness} · Back-to-back` : thickness
}

// Inverse of describeSintraCustom, used only to rehydrate the edit form from the persisted
// packageName string — thickness/back-to-back aren't stored as structured data on the order
// (the backend whitelists a fixed set of pricing keys), so this parses them back out of the
// human-readable description. Defensive default: 3mm, no back-to-back.
export function parseSintraCustomDescription(
  description: string
): { thickness: SintraThickness; backToBack: boolean } {
  return {
    thickness: description.startsWith("5mm") ? "5mm" : "3mm",
    backToBack: description.includes("Back-to-back"),
  }
}
