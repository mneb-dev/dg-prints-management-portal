import { useEffect, useState } from "react"

import type { ShippingAddress, ShippingAddressParts } from "@/lib/orders"

export type { ShippingAddressParts }

// Province → City/Municipality → Barangay data, generated from PSGC by scripts/build-ph-address.mjs into
// public/ph-address/. index.json lists every province with its city names (enough for search + Autofill);
// each <slug>.json holds one province's barangays and is fetched only when needed.

/** SPX Express's top-level area, derived from the province (shown, never picked or stored). */
export type PhZone = "Metro Manila" | "North Luzon" | "South Luzon" | "Visayas" | "Mindanao"
export type PhProvinceSummary = { name: string; slug: string; zone: PhZone; cities: string[] }
export type PhCity = { name: string; barangays: string[] }
export type PhProvince = { name: string; cities: PhCity[] }

export const EMPTY_SHIPPING_PARTS: ShippingAddressParts = { detail: "", barangay: "", city: "", province: "", zip: "" }

export const ADDRESS_MAX = 250
export const ADDRESS_DETAIL_MAX = 150

const base = `${(import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "")}/ph-address`
let indexPromise: Promise<PhProvinceSummary[]> | null = null
const provincePromises = new Map<string, Promise<PhProvince>>()

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Couldn't load address data (${res.status})`)
  return (await res.json()) as T
}

export function loadPhProvinces(): Promise<PhProvinceSummary[]> {
  indexPromise ??= getJson<{ provinces: PhProvinceSummary[] }>(`${base}/index.json`)
    .then((data) => data.provinces)
    .catch((err) => {
      indexPromise = null // let a later call retry
      throw err
    })
  return indexPromise
}

export async function loadPhProvince(provinceName: string): Promise<PhProvince | null> {
  const summary = (await loadPhProvinces()).find((p) => p.name === provinceName)
  if (!summary) return null
  let promise = provincePromises.get(summary.slug)
  if (!promise) {
    promise = getJson<PhProvince>(`${base}/${summary.slug}.json`)
    promise.catch(() => provincePromises.delete(summary.slug))
    provincePromises.set(summary.slug, promise)
  }
  return promise
}

/** The province list, or null while it loads (or if it failed — `error` says so). */
export function usePhProvinces() {
  const [provinces, setProvinces] = useState<PhProvinceSummary[] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    loadPhProvinces().then(
      (data) => active && setProvinces(data),
      () => active && setError(true)
    )
    return () => {
      active = false
    }
  }, [])
  return { provinces, error }
}

/** One province's cities + barangays; null until loaded or when no province is given. */
export function usePhProvince(provinceName: string) {
  // Keyed by name, so switching provinces shows nothing (not the previous one) until the new one loads.
  const [loaded, setLoaded] = useState<{ name: string; data: PhProvince | null } | null>(null)
  useEffect(() => {
    if (!provinceName) return
    let active = true
    loadPhProvince(provinceName).then(
      (data) => active && setLoaded({ name: provinceName, data }),
      () => active && setLoaded({ name: provinceName, data: null })
    )
    return () => {
      active = false
    }
  }, [provinceName])
  return loaded?.name === provinceName ? loaded.data : null
}

/** Lowercase, accents removed, punctuation → spaces: for matching typed/pasted text against place names. */
export function searchKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * One line for the order, e.g. "Block 5 Lot 12 Mabini Street, Brgy. Poblacion, Morong, Bataan 2108".
 * Must match the server's composeAddress (dg-prints-management-server/src/utils/phAddress.ts), which
 * recomposes it on save.
 */
export function composeAddress(parts: ShippingAddressParts): string {
  const barangay = parts.barangay.trim()
  const barangayLabel = /^(brgy\.?|barangay)\s/i.test(barangay) ? barangay : `Brgy. ${barangay}`
  const zip = parts.zip.trim()
  return `${parts.detail.trim()}, ${barangayLabel}, ${parts.city.trim()}, ${parts.province.trim()}${zip ? ` ${zip}` : ""}`
}

export function hasAnyPart(parts: ShippingAddressParts): boolean {
  return Object.values(parts).some((value) => !!value.trim())
}

/** "North Luzon / Bataan / Morong / Poblacion" — the same order SPX shows. Metro Manila isn't repeated. */
export function formatLocation(
  parts: Pick<ShippingAddressParts, "province" | "city" | "barangay">,
  zone?: PhZone
): string {
  const levels = [zone && zone !== parts.province ? zone : "", parts.province, parts.city, parts.barangay]
  return levels.filter(Boolean).join(" / ")
}

/**
 * The recipient as one line in the shape SPX's "Paste & Autofill" reads best
 * ("Name, 09XXXXXXXXX, detail, Brgy. X, City, Province ZIP").
 */
export function formatShippingForSpx(shipping: Pick<ShippingAddress, "name" | "phone" | "address">): string {
  return [shipping.name, shipping.phone, shipping.address].map((part) => part.trim()).filter(Boolean).join(", ")
}
