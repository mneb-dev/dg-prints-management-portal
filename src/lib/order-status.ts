import type { ProductCategory } from "@/lib/products"
import { ORDER_STATUSES } from "@/lib/orders-slice"
import type { Order, OrderStatus, PaymentStatus } from "@/lib/orders-slice"
import type { Role } from "@/lib/users-slice"

export const ORDER_TERMINAL_STATUSES: OrderStatus[] = ["cancelled", "refunded"]

const DEFAULT_STATUS_FLOW: OrderStatus[] = ["pending", "layout", "released"]

const CATEGORY_STATUS_FLOWS: Partial<Record<string, OrderStatus[]>> = {
  "Sticker": ["pending", "layout", "trace", "print", "cut", "pack", "pickup", "released"],
  "Laminated Sticker": ["pending", "layout", "trace", "print", "cut", "pack", "pickup", "released"],
  Tarpaulin: ["pending", "layout", "print", "pickup", "released"],
  "Sintra": ["pending", "layout", "print", "cut", "pickup", "released"],
  "3D Print": ["pending", "layout", "print", "pickup", "released"],
  "General Merchandise": ["pending", "layout", "released"],
}

export function getStatusFlowForCategory(category: ProductCategory): OrderStatus[] {
  return CATEGORY_STATUS_FLOWS[category] ?? DEFAULT_STATUS_FLOW
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_TERMINAL_STATUSES.includes(status)
}

/** The ordered, non-terminal status flow for this order's product category (first line item
 * decides the category-specific flow; falls back to the full status list if the order has no
 * items). Shared by the status-change menu and the read-only progress stepper. */
export function getOrderWorkflowStatuses(order: Order): OrderStatus[] {
  const firstItem = order.items[0]
  const flow = firstItem ? getStatusFlowForCategory(firstItem.productCategory) : ORDER_STATUSES
  return flow.filter((status) => !isTerminalStatus(status))
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

export type OrderStatusOption = {
  value: OrderStatus
  disabled: boolean
  reason?: string
}

/** Single source of truth for "what can this order become right now" — combines the
 * category's status flow with the payment/role guards. Used by every surface that lets
 * someone change an order's status (details page, table). `cancelled`/`refunded` are always
 * appended (guarded) so they're visible as menu options even though no category flow lists them. */
export function getOrderStatusOptions(order: Order): OrderStatusOption[] {
  const workflowStatuses = getOrderWorkflowStatuses(order)

  const canRelease = canReleaseOrder(order.status, order.payment.status)
  const options: OrderStatusOption[] = workflowStatuses.map((value) =>
    value === "released" && !canRelease
      ? { value, disabled: true, reason: "Requires payment marked Paid" }
      : { value, disabled: false }
  )

  options.push({
    value: "cancelled",
    disabled: isTerminalStatus(order.status),
    reason: "Order is already cancelled or refunded",
  })

  options.push({
    value: "refunded",
    disabled: !canRefundOrder(order.status, order.payment.status),
    reason: "Requires a deposit or full payment on a non-cancelled order",
  })

  return options
}
