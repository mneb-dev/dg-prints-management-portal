import type { ProductCategory } from "@/lib/products"
import type { OrderStatus, PaymentStatus } from "@/lib/orders-slice"

export const ORDER_TERMINAL_STATUSES: OrderStatus[] = ["cancelled", "refunded"]

const CATEGORY_STATUS_FLOWS: Record<ProductCategory, OrderStatus[]> = {
  "Sticker Label": ["pending", "layout", "trace", "print", "cut", "pack", "pickup", "released"],
  Tarpaulin: ["pending", "layout", "print", "pickup", "released"],
  "Sintra Board": ["pending", "layout", "print", "cut", "pickup", "released"],
  "3D Print": ["pending", "layout", "print", "pickup", "released"],
  "General Merchandise": ["pending", "layout", "released"],
}

export function getStatusFlowForCategory(category: ProductCategory): OrderStatus[] {
  return CATEGORY_STATUS_FLOWS[category]
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_TERMINAL_STATUSES.includes(status)
}

export function canRefundOrder(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return !isTerminalStatus(status) && paymentStatus !== "unpaid"
}
