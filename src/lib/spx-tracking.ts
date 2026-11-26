// SPX tracking numbers (e.g. "SPEPH06200552895B"). Mirrors the server's normalizeTrackingNumber: letters,
// digits and dashes, uppercased, at most 40.

export const TRACKING_NUMBER_MAX = 40

/** What the input keeps while typing: uppercase, no spaces or other symbols. */
export function cleanTrackingInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, TRACKING_NUMBER_MAX)
}

export function spxTrackingUrl(trackingNumber: string): string {
  return `https://spx.ph/track?${encodeURIComponent(trackingNumber)}`
}
