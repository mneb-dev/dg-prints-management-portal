import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  orderAdded,
  orderDeleted,
  orderStatusChanged,
  orderUpdated,
} from "@/lib/orders-slice"
import type { Order, OrderInput, OrderStatus } from "@/lib/orders-slice"
import { generateId } from "@/lib/utils"

export { ORDER_STATUSES } from "@/lib/orders-slice"
export type {
  Order,
  OrderInput,
  OrderItem,
  OrderItemPricing,
  OrderStatus,
  SelectedOption,
} from "@/lib/orders-slice"

function nextOrderNumber(existing: Order[]): string {
  const max = existing.reduce((acc, order) => {
    const n = Number(order.orderNumber.replace(/^ORD-/, ""))
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 0)
  return `ORD-${String(max + 1).padStart(3, "0")}`
}

export function useOrders() {
  const orders = useAppSelector((state) => state.orders.items)
  const dispatch = useAppDispatch()

  function addOrder(input: OrderInput): string {
    const id = generateId()
    const orderNumber = nextOrderNumber(orders)
    dispatch(orderAdded({ ...input, id, orderNumber }))
    return id
  }

  function updateOrder(id: string, changes: Partial<Order>) {
    dispatch(orderUpdated(id, changes))
  }

  function setOrderStatus(id: string, status: OrderStatus) {
    dispatch(orderStatusChanged(id, status))
  }

  function deleteOrder(id: string) {
    dispatch(orderDeleted(id))
  }

  function getOrder(id: string) {
    return orders.find((order) => order.id === id)
  }

  return { orders, addOrder, updateOrder, setOrderStatus, deleteOrder, getOrder }
}
