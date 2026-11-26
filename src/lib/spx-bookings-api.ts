import { apiClient } from "@/lib/api-client"

// POST /orders/tracking-numbers — see the server route. dryRun reports without saving.

export type TrackingImportStatus =
  | "will_set"
  | "updated"
  | "will_replace"
  | "replaced"
  | "unchanged"
  | "not_found"
  | "invalid"
  | "duplicate"

export type TrackingImportResult = {
  orderNumber: string
  trackingNumber: string | null
  status: TrackingImportStatus
  orderId?: string
  customerName?: string
  previousTrackingNumber?: string | null
  error?: string
}

export async function importTrackingNumbers(
  rows: { orderNumber: string; trackingNumber: string }[],
  dryRun: boolean
): Promise<TrackingImportResult[]> {
  const { data } = await apiClient.post<{ results: TrackingImportResult[] }>("/orders/tracking-numbers", {
    rows,
    dryRun,
  })
  return data.results
}
