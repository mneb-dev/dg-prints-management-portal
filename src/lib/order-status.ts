import type { ProductCategory } from "@/lib/products"
import type { OrderStatus, PaymentStatus } from "@/lib/orders-slice"
import type { Role } from "@/lib/users-slice"

export const ORDER_TERMINAL_STATUSES: OrderStatus[] = ["cancelled", "refunded"]

const DEFAULT_STATUS_FLOW: OrderStatus[] = ["pending", "layout", "released"]

const CATEGORY_STATUS_FLOWS: Partial<Record<string, OrderStatus[]>> = {
  "Sticker Label": ["pending", "layout", "trace", "print", "cut", "pack", "pickup", "released"],
  "Laminated Sticker": ["pending", "layout", "trace", "print", "cut", "pack", "pickup", "released"],
  Tarpaulin: ["pending", "layout", "print", "pickup", "released"],
  "Sintra Board": ["pending", "layout", "print", "cut", "pickup", "released"],
  "3D Print": ["pending", "layout", "print", "pickup", "released"],
  "General Merchandise": ["pending", "layout", "released"],
}

export function getStatusFlowForCategory(category: ProductCategory): OrderStatus[] {
  return CATEGORY_STATUS_FLOWS[category] ?? DEFAULT_STATUS_FLOW
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_TERMINAL_STATUSES.includes(status)
}

export function canRefundOrder(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return !isTerminalStatus(status) && paymentStatus !== "unpaid"
}

export function canReleaseOrder(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return status !== "released" && !isTerminalStatus(status) && paymentStatus === "paid"
}

export function isReleaseLockedForRole(status: OrderStatus, role: Role | null | undefined): boolean {
  return role === "staff" && status === "released"
}

export function canEditOrderMetadata(role: Role | null | undefined): boolean {
  return role === "admin" || role === "superadmin"
}
