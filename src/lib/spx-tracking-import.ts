import { strFromU8, unzipSync } from "fflate"

// Reads SPX's order report (.xlsx downloaded from SPX's order list) for "Import SPX tracking". Pure — no
// network — so it can be checked in Node. Columns are found by header name: the report starts with a
// "Report Download Time" line, then the headers, and SPX may add or move columns.

export type SpxReportRow = {
  trackingNumber: string
  /** The Customer Reference No. — our order number when the parcel came from Export to SPX; null when blank/"-". */
  orderNumber: string | null
  recipientName: string
  trackingStatus: string
}

const HEADERS = {
  tracking: "tracking no.",
  reference: "customer reference no.",
  recipient: "recipient name",
  status: "tracking status",
} as const

const decodeXml = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")

/** Text of every <t> inside a shared string or inline string (rich text has several runs). */
const textOf = (xml: string) => decodeXml([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""))

/** "AB12" → 27 (0-based column index). */
function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A"
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
}

function readFirstSheet(files: Record<string, Uint8Array>): string {
  const workbook = files["xl/workbook.xml"] ? strFromU8(files["xl/workbook.xml"]) : ""
  const rels = files["xl/_rels/workbook.xml.rels"] ? strFromU8(files["xl/_rels/workbook.xml.rels"]) : ""
  const rid = /<sheet\s[^>]*r:id="([^"]+)"/.exec(workbook)?.[1]
  const target = rid ? new RegExp(`<Relationship\\s[^>]*Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] : undefined
  const path = target ? `xl/${target.replace(/^\/?xl\//, "")}` : "xl/worksheets/sheet1.xml"
  const sheet = files[path]
  if (!sheet) throw new Error("This file has no sheet to read.")
  return strFromU8(sheet)
}

/** Every row as an array of cell texts (by column position). */
function readRows(files: Record<string, Uint8Array>): string[][] {
  const shared = files["xl/sharedStrings.xml"]
    ? [...strFromU8(files["xl/sharedStrings.xml"]).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]))
    : []
  const sheet = readFirstSheet(files)
  return [...sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const cells: string[] = []
    for (const cell of rowMatch[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1]
      const inner = cell[2] ?? ""
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1]
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1]
      const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]
      let value = ""
      if (type === "s" && raw !== undefined) value = shared[Number(raw)] ?? ""
      else if (type === "inlineStr") value = textOf(inner)
      else if (raw !== undefined) value = decodeXml(raw)
      cells[ref ? columnIndex(ref) : cells.length] = value.trim()
    }
    return Array.from(cells, (value) => value ?? "")
  })
}

/** The report's parcels. Throws a readable error when the file isn't SPX's order report. */
export function parseSpxReport(bytes: Uint8Array): SpxReportRow[] {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error("This isn't an Excel (.xlsx) file.")
  }
  const rows = readRows(files)
  const headerIndex = rows.findIndex((row) => {
    const names = row.map((cell) => cell.toLowerCase())
    return names.includes(HEADERS.tracking) && names.includes(HEADERS.reference)
  })
  if (headerIndex === -1) {
    throw new Error('This doesn\'t look like SPX\'s order report — no "Tracking No." and "Customer Reference No." columns.')
  }
  const names = rows[headerIndex].map((cell) => cell.toLowerCase())
  const col = (name: string) => names.indexOf(name)
  const [tracking, reference, recipient, status] = [
    col(HEADERS.tracking),
    col(HEADERS.reference),
    col(HEADERS.recipient),
    col(HEADERS.status),
  ]

  return rows
    .slice(headerIndex + 1)
    .map((row) => {
      const ref = (row[reference] ?? "").trim()
      return {
        trackingNumber: (row[tracking] ?? "").trim().toUpperCase(),
        orderNumber: ref && ref !== "-" ? ref : null,
        recipientName: recipient >= 0 ? (row[recipient] ?? "") : "",
        trackingStatus: status >= 0 ? (row[status] ?? "") : "",
      }
    })
    .filter((row) => row.trackingNumber && row.trackingNumber !== "-")
}
