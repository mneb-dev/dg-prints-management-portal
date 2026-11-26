// SPX's tracking page also finds a parcel by its Customer Reference No. — our order number, which Export to
// SPX writes — so we link by order number instead of storing SPX's tracking number.

export function spxTrackingUrl(reference: string): string {
  return `https://spx.ph/track?${encodeURIComponent(reference)}`
}
