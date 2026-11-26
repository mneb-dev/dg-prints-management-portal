import { apiClient } from "@/lib/api-client"

// POST /orders/spx-bookings — marks the orders in SPX's order report arranged (see the server route).
// dryRun reports without saving.

export type SpxBookingStatus = "will_arrange" | "arranged" | "already_arranged" | "not_found" | "invalid" | "duplicate"

export type SpxBookingResult = {
  orderNumber: string
  status: SpxBookingStatus
  orderId?: string
  customerName?: string
}

export async function importSpxBookings(orderNumbers: string[], dryRun: boolean): Promise<SpxBookingResult[]> {
  const { data } = await apiClient.post<{ results: SpxBookingResult[] }>("/orders/spx-bookings", {
    orderNumbers,
    dryRun,
  })
  return data.results
}
