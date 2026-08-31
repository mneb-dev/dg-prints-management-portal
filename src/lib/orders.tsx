import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createOrderThunk,
  deleteOrderThunk,
  fetchOrderByIdThunk,
  fetchOrdersThunk,
  setOrdersParams,
  updateOrderThunk,
} from "@/lib/orders-slice"
import type {
  Order,
  OrderInput,
  OrderStatus,
  OrdersQueryParams,
  OrderUpdateInput,
} from "@/lib/orders-slice"

export {
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/orders-slice"
export {
  ORDER_TERMINAL_STATUSES,
  canEditOrderMetadata,
  canReleaseOrder,
  canRefundOrder,
  getStatusFlowForCategory,
  isReleaseLockedForRole,
  isTerminalStatus,
} from "@/lib/order-status"
export type {
  Order,
  OrderAdminEditableFields,
  OrderChannel,
  OrderInput,
  OrderItem,
  OrderItemPricing,
  OrderStatus,
  OrdersQueryParams,
  OrderUpdateInput,
  Payment,
  PaymentMethod,
  PaymentStatus,
  SelectedOption,
  ShippingAddress,
} from "@/lib/orders-slice"

/** Paginated Orders list — for the Orders list page only. Refetches whenever `params` changes. */
export function useOrders() {
  const orders = useAppSelector((state) => state.orders.items)
  const total = useAppSelector((state) => state.orders.total)
  const params = useAppSelector((state) => state.orders.params)
  const status = useAppSelector((state) => state.orders.status)
  const error = useAppSelector((state) => state.orders.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchOrdersThunk(params))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    params.page,
    params.pageSize,
    params.search,
    params.status,
    params.paymentStatus,
    params.category,
    params.dateFrom,
    params.dateTo,
    params.sortBy,
    params.sortDir,
  ])

  function setParams(patch: Partial<OrdersQueryParams>) {
    dispatch(setOrdersParams(patch))
  }

  function refetch() {
    dispatch(fetchOrdersThunk(params))
  }

  return {
    orders,
    total,
    params,
    setParams,
    refetch,
    isLoading: status === "idle" || (status === "loading" && orders.length === 0),
    isFetching: status === "loading" && orders.length > 0,
    isError: status === "failed",
    error,
  }
}

/** Fetches a single order by id — for the Order detail/edit pages. */
export function useOrder(id: string | undefined) {
  const dispatch = useAppDispatch()
  const order = useAppSelector((state) => state.orders.current)
  const status = useAppSelector((state) => state.orders.currentStatus)
  const error = useAppSelector((state) => state.orders.currentError)

  useEffect(() => {
    if (id) dispatch(fetchOrderByIdThunk(id))
  }, [dispatch, id])

  return {
    order: order?.id === id ? order : undefined,
    isLoading: status === "loading" || status === "idle",
    isError: status === "failed",
    error,
  }
}

/** Order create/update/delete only — no list fetch. For forms and dialogs. */
export function useOrderActions() {
  const dispatch = useAppDispatch()

  async function addOrder(input: OrderInput): Promise<Order> {
    return await dispatch(createOrderThunk(input)).unwrap()
  }

  async function updateOrder(id: string, changes: OrderUpdateInput): Promise<Order> {
    return await dispatch(updateOrderThunk({ id, changes })).unwrap()
  }

  async function setOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    return updateOrder(id, { status })
  }

  async function deleteOrder(id: string): Promise<void> {
    await dispatch(deleteOrderThunk(id)).unwrap()
  }

  return { addOrder, updateOrder, setOrderStatus, deleteOrder }
}
