import type { Category } from "@/lib/categories-slice"
import type { OrderStatusItem } from "@/lib/order-statuses-slice"
import type { ProductCategory } from "@/lib/products"
import type { Order, OrderStatus, PaymentStatus } from "@/lib/orders-slice"
import type { Role } from "@/lib/users-slice"

export const ORDER_TERMINAL_STATUSES: OrderStatus[] = ["cancelled", "refunded", "returned"]

/** Statuses left out of the dashboard's per-status tiles and pipeline chart, on top of the
 * terminal ones — "released" is the fulfillment finish line, not an in-progress step worth
 * tracking as a running count there. */
export const DASHBOARD_EXCLUDED_STATUSES: OrderStatus[] = ["released"]

const DEFAULT_STATUS_FLOW: OrderStatus[] = ["pending", "layout", "released"]

// The literal status name the "Curing" status was created with (see the Order Statuses tab's
// add-row, which slugifies the typed label into this name). Curing needs two bits of special
// handling other statuses don't: a confirmation before leaving it (order-status-menu.tsx) and
// an elapsed-time readout while an order sits in it (formatCuringDuration below) — both key off
// this literal name rather than a flag, same trade-off already accepted for the hardcoded
// terminal-status names.
export const CURING_STATUS_NAME = "curing"

export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_TERMINAL_STATUSES.includes(status)
}

/** "3h", "2d 4h", "45m" — elapsed time since `statusUpdatedAt`, for the "Curing + {duration}"
 * readout shown wherever an order's status label appears while it's in Curing. Returns null
 * when there's no timestamp to measure from (shouldn't happen in practice — every status
 * change stamps statusUpdatedAt — but the field is nullable on the Order type). */
export function formatCuringDuration(statusUpdatedAt: string | null): string | null {
  if (!statusUpdatedAt) return null
  const elapsedMs = Date.now() - new Date(statusUpdatedAt).getTime()
  if (elapsedMs < 0) return null

  const totalMinutes = Math.floor(elapsedMs / 60000)
  if (totalMinutes < 60) return `${Math.max(1, totalMinutes)}m`

  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h`

  const days = Math.floor(totalHours / 24)
  const remainingHours = totalHours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

/** The full ordered sequence a category's status flow can be built from — the master list
 * offered as checkboxes when configuring a category (see CategoryFormDialog). Statuses are
 * now admin-managed (see useActiveOrderStatuses), so this takes the live list rather than a
 * fixed array — order follows each status's admin-configured sortOrder. */
export function getCategoryStatusFlowOptions(statuses: OrderStatusItem[]): OrderStatus[] {
  return statuses.filter((status) => !isTerminalStatus(status.name)).map((status) => status.name)
}

/** Looks up the configured status flow for a product category by name. Falls back to the
 * generic 3-step default when the category can't be found (e.g. categories still loading,
 * or an order item's historical category-name snapshot no longer matches a live category). */
export function getStatusFlowForCategory(
  category: ProductCategory,
  categories: Category[]
): OrderStatus[] {
  return categories.find((c) => c.name === category)?.statusFlow ?? DEFAULT_STATUS_FLOW
}

/** The ordered, non-terminal status flow for this order's product category (first line item
 * decides the category-specific flow; falls back to the full active-status list if the order
 * has no items). Shared by the status-change menu and the read-only progress stepper.
 * `allStatusNames` should be every active status's name, in admin-configured order. */
export function getOrderWorkflowStatuses(
  order: Order,
  categories: Category[],
  allStatusNames: OrderStatus[]
): OrderStatus[] {
  const firstItem = order.items[0]
  const flow = firstItem
    ? getStatusFlowForCategory(firstItem.productCategory, categories)
    : allStatusNames
  return flow.filter((status) => !isTerminalStatus(status))
}

export function canRefundOrder(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return !isTerminalStatus(status) && paymentStatus !== "unpaid"
}

export function canReleaseOrder(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  role: Role | null | undefined
): boolean {
  if (status === "released" || isTerminalStatus(status)) return false
  return paymentStatus === "paid" || canEditOrderMetadata(role)
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
 * appended (guarded) so they're visible as menu options even though no category flow lists them.
 * `allStatusNames` should be every active status's name, in admin-configured order. */
export function getOrderStatusOptions(
  order: Order,
  categories: Category[],
  role: Role | null | undefined,
  allStatusNames: OrderStatus[]
): OrderStatusOption[] {
  const workflowStatuses = getOrderWorkflowStatuses(order, categories, allStatusNames)

  const canRelease = canReleaseOrder(order.status, order.payment.status, role)
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

  options.push({
    value: "returned",
    disabled: isTerminalStatus(order.status),
    reason: "Order is already cancelled, refunded, or returned",
  })

  return options
}
