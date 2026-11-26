import { strFromU8, strToU8, unzipSync, zipSync } from "fflate"

import type { SpxItemType } from "@/lib/spx-item-types"

// The pure part of "Export to SPX" (no network): row shape, SPX's limits, row checks and writing rows into
// SPX's mass order template. See spx-export.ts for loading orders and downloading the file.

export type SpxPayer = "Sender Pay" | "Receiver Pay"

/** One parcel row, in the template's column order. */
export type SpxExportRow = {
  orderId: string
  orderNumber: string
  recipientName: string
  /** SPX wants 10 digits starting with 9 (no 0 / +63). */
  recipientPhone: string
  /** The full one-line address — SPX asks for all four levels in it. */
  detailedAddress: string
  region: string
  province: string
  town: string
  barangay: string
  postalCode: string
  weightKg: string
  lengthCm: string
  widthCm: string
  heightCm: string
  itemType: SpxItemType
  itemName: string
  itemQuantity: number
  payer: SpxPayer
  parcelValue: number
  /** True when the order only has an older free-text address (no SPX location columns). */
  freeTextAddress: boolean
}

// SPX's limits, from the template's Field Definitions sheet.
export const SPX_LIMITS = { weightKg: 50, sideCm: 150, parcelValue: 50_000, text: 250, reference: 32 } as const

/** "09171234567" / "+63 917 123 4567" → "9171234567"; "" when it isn't a PH mobile number. */
export function toSpxPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  const local = digits.slice(-10)
  return /^9\d{9}$/.test(local) && (digits.length === 10 || /^(0|63)9/.test(digits)) ? local : ""
}

/** What SPX would reject in this row (empty = OK). */
export function rowProblems(row: SpxExportRow): string[] {
  const problems: string[] = []
  const number = (value: string) => (value.trim() ? Number(value) : NaN)
  if (!row.recipientName.trim()) problems.push("Recipient name is missing")
  if (!row.recipientPhone) problems.push("Phone isn't a PH mobile number")
  if (!row.detailedAddress.trim()) problems.push("Address is missing")
  if (row.detailedAddress.length > SPX_LIMITS.text) problems.push(`Address is over ${SPX_LIMITS.text} characters`)
  const weight = number(row.weightKg)
  if (!(weight > 0 && weight <= SPX_LIMITS.weightKg)) problems.push(`Weight must be more than 0 and at most ${SPX_LIMITS.weightKg} kg`)
  if (![row.lengthCm, row.widthCm, row.heightCm].every((side) => number(side) > 0 && number(side) <= SPX_LIMITS.sideCm)) {
    problems.push(`Each side must be more than 0 and at most ${SPX_LIMITS.sideCm} cm`)
  }
  if (!row.itemName.trim()) problems.push("Item name is missing")
  if (row.parcelValue <= 0) problems.push("Parcel value must be more than ₱0")
  if (row.parcelValue > SPX_LIMITS.parcelValue) problems.push(`Parcel value is over SPX's ₱${SPX_LIMITS.parcelValue.toLocaleString()} limit`)
  return problems
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Characters XML 1.0 can't carry (control codes) would corrupt the file.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")

const COLUMNS = "ABCDEFGHIJKLMNOPQRSTU".split("")

function rowCells(row: SpxExportRow): (string | number | null)[] {
  // Template order: Recipient Name, Phone, Detailed Address, Region, Province, Town/City, Barangay, Postal Code,
  // Weight, Length, Width, Height, Item Type, Item Name, Item Quantity, Customer Reference No., Payment Method,
  // Delivery Instruction, COD Collection (Y/N), COD Amount, Parcel Value.
  return [
    row.recipientName.trim().slice(0, SPX_LIMITS.text),
    row.recipientPhone,
    row.detailedAddress.trim().slice(0, SPX_LIMITS.text),
    row.region || null,
    row.province || null,
    row.town || null,
    row.barangay || null,
    row.postalCode || null,
    Number(row.weightKg),
    Number(row.lengthCm),
    Number(row.widthCm),
    Number(row.heightCm),
    row.itemType,
    row.itemName.trim().slice(0, SPX_LIMITS.text),
    row.itemQuantity,
    row.orderNumber.slice(0, SPX_LIMITS.reference),
    row.payer,
    null,
    "N", // COD is never used (staff decision)
    null,
    row.parcelValue,
  ]
}

function cellXml(ref: string, value: string | number | null): string {
  if (value === null || value === "") return ""
  if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

/** The template with its Order Sheet holding `rows` (header kept) — ready to save as .xlsx. */
export function buildSpxWorkbook(template: Uint8Array, rows: SpxExportRow[]): Uint8Array {
  const files = unzipSync(template)
  const workbook = strFromU8(files["xl/workbook.xml"])
  const rels = strFromU8(files["xl/_rels/workbook.xml.rels"])
  const sheetRid = /<sheet [^>]*name="Order Sheet"[^>]*r:id="([^"]+)"/.exec(workbook)?.[1]
  const target = sheetRid ? new RegExp(`<Relationship [^>]*Id="${sheetRid}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] : undefined
  if (!target) throw new Error("The SPX template has no Order Sheet")
  const sheetPath = `xl/${target.replace(/^\/?xl\//, "")}`

  const sheet = strFromU8(files[sheetPath])
  const header = /<row [^>]*r="1"[^>]*>[\s\S]*?<\/row>/.exec(sheet)?.[0]
  if (!header) throw new Error("The SPX template's Order Sheet has no header row")
  const body = rows
    .map((row, index) => {
      const r = index + 2
      const cells = rowCells(row).map((value, col) => cellXml(`${COLUMNS[col]}${r}`, value)).join("")
      return `<row r="${r}">${cells}</row>`
    })
    .join("")
  const lastRow = Math.max(rows.length + 1, 1)
  const filled = sheet
    .replace(/<sheetData>[\s\S]*?<\/sheetData>|<sheetData\/>/, `<sheetData>${header}${body}</sheetData>`)
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:U${lastRow}"/>`)

  files[sheetPath] = strToU8(filled)
  return zipSync(files, { level: 6 })
}
