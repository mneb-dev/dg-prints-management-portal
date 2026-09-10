import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns"

export type PeriodPreset = "this_week" | "this_month" | "last_3_months" | "last_6_months" | "this_year" | "custom"
export type PeriodRange = { start: Date; end: Date }

export const PERIOD_PRESETS: PeriodPreset[] = [
  "this_week",
  "this_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "custom",
]

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  this_week: "This week",
  this_month: "This month",
  last_3_months: "Last 3 months",
  last_6_months: "Last 6 months",
  this_year: "This year",
  custom: "Custom",
}

// Matches the server's MAX_RANGE_DAYS in routes/finance.ts.
export const MAX_RANGE_DAYS = 366

export function computePeriodRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
  now: Date
): PeriodRange | null {
  let start: Date
  let end: Date

  switch (preset) {
    case "this_week":
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case "this_month":
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case "last_3_months":
      start = subMonths(now, 3)
      end = now
      break
    case "last_6_months":
      start = subMonths(now, 6)
      end = now
      break
    case "this_year":
      start = startOfYear(now)
      end = endOfYear(now)
      break
    case "custom": {
      if (!customFrom || !customTo || customFrom > customTo) return null
      start = parseISO(customFrom)
      end = parseISO(customTo)
      break
    }
  }

  const today = endOfDay(now)
  const normalizedStart = startOfDay(start)
  const normalizedEnd = endOfDay(end) > today ? today : endOfDay(end)
  if (normalizedEnd < normalizedStart) return null
  if (differenceInCalendarDays(normalizedEnd, normalizedStart) + 1 > MAX_RANGE_DAYS) return null

  return { start: normalizedStart, end: normalizedEnd }
}
