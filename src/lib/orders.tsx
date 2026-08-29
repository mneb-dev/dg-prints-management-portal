import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createOrderThunk,
  deleteOrderThunk,
  fetchOrdersThunk,
  updateOrderThunk,
} from "@/lib/orders-slice"
import type { Order, OrderInput, OrderStatus } from "@/lib/orders-slice"

export {
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/orders-slice"
export {
  ORDER_TERMINAL_STATUSES,
  canRefundOrder,
  getStatusFlowForCategory,
  isTerminalStatus,
} from "@/lib/order-status"
export type {
  Order,
  OrderChannel,
  OrderInput,
  OrderItem,
  OrderItemPricing,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  SelectedOption,
  ShippingAddress,
} from "@/lib/orders-slice"

export function useOrders() {
  const orders = useAppSelector((state) => state.orders.items)
  const status = useAppSelector((state) => state.orders.status)
  const error = useAppSelector((state) => state.orders.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchOrdersThunk())
  }, [dispatch])

  async function addOrder(input: OrderInput): Promise<Order> {
    return await dispatch(createOrderThunk(input)).unwrap()
  }

  async function updateOrder(id: string, changes: Partial<OrderInput>): Promise<Order> {
    return await dispatch(updateOrderThunk({ id, changes })).unwrap()
  }

  async function setOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    return updateOrder(id, { status })
  }

  async function deleteOrder(id: string): Promise<void> {
    await dispatch(deleteOrderThunk(id)).unwrap()
  }

  function getOrder(id: string) {
    return orders.find((order) => order.id === id)
  }

  return {
    orders,
    isLoading: status === "loading" || status === "idle",
    isError: status === "failed",
    error,
    addOrder,
    updateOrder,
    setOrderStatus,
    deleteOrder,
    getOrder,
  }
}
