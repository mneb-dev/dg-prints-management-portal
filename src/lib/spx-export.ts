import { apiClient } from "@/lib/api-client"
import type { OrderStatusItem } from "@/lib/order-statuses-slice"
import { normalizeOrder, type Order } from "@/lib/orders-slice"
import { loadPhProvinces } from "@/lib/ph-address"
import type { SpxExportDefaults } from "@/lib/settings"
import { buildSpxWorkbook, SPX_LIMITS, toSpxPhone, type SpxExportRow } from "@/lib/spx-workbook"

export * from "@/lib/spx-workbook"

// "Export to SPX": fills SPX Express's own mass order template (public/spx/, the same file the address data
// is built from) with one row per order, so staff upload one file to SPX instead of copying orders one by one.
// The template's other sheets, drop-downs and checks are kept; only the Order Sheet's rows are written.

export const SPX_TEMPLATE_URL = `${(import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "")}/spx/mass_order_creation_template_ph_V2.xlsx`

/** The "To Pack" status key — found by its label, since keys can be renamed in Categories; "pack" as seeded. */
async function toPackStatus(): Promise<string> {
  try {
    const { data } = await apiClient.get<OrderStatusItem[]>("/order-statuses")
    return data.find((status) => status.label.trim().toLowerCase() === "to pack")?.name ?? "pack"
  } catch {
    return "pack"
  }
}

/**
 * Orders ready to book in SPX, newest first: status "To Pack", paid, with a delivery address, and not yet
 * marked arranged.
 */
export async function loadExportableOrders(maxPages = 6): Promise<Order[]> {
  const status = await toPackStatus()
  const orders: Order[] = []
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await apiClient.get<{ items: Order[]; total: number }>("/orders", {
      params: { status, arranged: false, paymentStatus: "paid", page, pageSize: 50, sortBy: "created_at", sortDir: "desc" },
    })
    orders.push(...data.items.map(normalizeOrder))
    if (page * 50 >= data.total) break
  }
  return orders.filter((order) => order.shippingAddress && order.status === status)
}

/** A row prefilled from the order and the Settings defaults. */
export async function rowFromOrder(order: Order, defaults: SpxExportDefaults): Promise<SpxExportRow> {
  const shipping = order.shippingAddress!
  const parts = shipping.parts
  const zone = parts ? ((await loadPhProvinces()).find((p) => p.name === parts.province)?.zone ?? "") : ""
  // "Product: notes" per item (just the product when it has no notes), so staff can tell parcels apart in SPX.
  const itemNames = [
    ...new Set(
      order.items
        .filter((item) => item.productName?.trim())
        .map((item) => {
          const notes = (item.notes ?? "").replace(/\s+/g, " ").trim()
          return notes ? `${item.productName.trim()}: ${notes}` : item.productName.trim()
        }),
    ),
  ]
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    recipientName: shipping.name,
    recipientPhone: toSpxPhone(shipping.phone),
    detailedAddress: shipping.address,
    region: zone,
    province: parts?.province ?? "",
    town: parts?.city ?? "",
    barangay: parts?.barangay ?? "",
    postalCode: parts?.zip ?? "",
    weightKg: String(defaults.weightKg),
    lengthCm: String(defaults.lengthCm),
    widthCm: String(defaults.widthCm),
    heightCm: String(defaults.heightCm),
    itemType: defaults.itemType,
    itemName: itemNames.join(" | ").slice(0, SPX_LIMITS.text),
    itemQuantity: order.items.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1,
    payer: "Sender Pay",
    // What's in the parcel: the order total without the shipping fee we charged.
    parcelValue: Math.max(0, Math.round((order.total - (shipping.fee || 0)) * 100) / 100),
    freeTextAddress: !parts,
  }
}

/** Downloads the template, fills it and hands the browser the file. */
export async function downloadSpxFile(rows: SpxExportRow[]): Promise<string> {
  const res = await fetch(SPX_TEMPLATE_URL)
  if (!res.ok) throw new Error(`Couldn't load the SPX template (${res.status})`)
  const bytes = buildSpxWorkbook(new Uint8Array(await res.arrayBuffer()), rows)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  // Local time, e.g. spx-orders-20261126-1531.xlsx
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  const fileName = `spx-orders-${stamp}.xlsx`
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return fileName
}
