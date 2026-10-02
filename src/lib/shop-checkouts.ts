import { apiClient } from "@/lib/api-client"

/** An online-shop cart sent to PayMongo. The order only exists once it's paid (`orderId`). */
export type ShopCheckout = {
  id: string
  total: number
  status: "pending" | "paid" | "expired"
  orderId: string | null
  orderNumber: string | null
  paymentMethod: string | null
  amountPaid: number | null
  customerName: string
  customerPhone: string
  items: string[]
  createdAt: string
  paidAt: string | null
}

/** Newest first; `search` matches the buyer's name or mobile number (any format). */
export async function listShopCheckouts(search: string): Promise<ShopCheckout[]> {
  const { data } = await apiClient.get<{ items: ShopCheckout[] }>("/shop-checkouts", {
    params: { search: search || undefined, limit: 20 },
  })
  return data.items
}

/** Re-asks PayMongo; if the payment is there, the server creates the paid order. */
export async function checkShopCheckout(id: string): Promise<ShopCheckout> {
  const { data } = await apiClient.post<ShopCheckout>(`/shop-checkouts/${id}/check`)
  return data
}
