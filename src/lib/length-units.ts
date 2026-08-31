export const LENGTH_UNITS = ["mm", "cm", "in", "ft", "m"] as const
export type LengthUnit = (typeof LENGTH_UNITS)[number]

const FEET_PER_UNIT: Record<LengthUnit, number> = {
  mm: 0.00328084,
  cm: 0.0328084,
  in: 1 / 12,
  ft: 1,
  m: 3.28084,
}

export function convertToFeet(value: number, unit: LengthUnit): number {
  return Math.round(value * FEET_PER_UNIT[unit] * 100) / 100
}
