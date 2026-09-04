import { useEffect, useMemo } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createOrderThunk,
  DEFAULT_ORDERS_PARAMS,
  deleteOrderThunk,
  fetchOrderByIdThunk,
  fetchOrderStatsThunk,
  fetchOrdersThunk,
  fetchRecentOrdersForRankingThunk,
  fetchTopCustomersThunk,
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
  DEFAULT_ORDERS_PARAMS,
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
  CustomerRanking,
  Order,
  OrderAdminEditableFields,
  OrderChannel,
  OrderInput,
  OrderItem,
  OrderItemPricing,
  OrderStats,
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

/** Top "hot" product ids from the latest 100 orders, fetched once per session — for the order-form product picker's hot badge. */
export function useHotProductIds() {
  const hotProductIds = useAppSelector((state) => state.orders.hotProductIds)
  const status = useAppSelector((state) => state.orders.rankingStatus)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchRecentOrdersForRankingThunk())
  }, [dispatch])

  return { hotProductIds, isLoading: status === "loading" || status === "idle" }
}

/** The latest 100 orders, fetched once per session (shared with `useHotProductIds`) — for dashboard
 * widgets that need real recent-order data. Scoped to the last 100 orders, not the full history. */
export function useRecentOrders() {
  const recentOrders = useAppSelector((state) => state.orders.recentOrders)
  const status = useAppSelector((state) => state.orders.rankingStatus)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchRecentOrdersForRankingThunk())
  }, [dispatch])

  return {
    recentOrders,
    isLoading: status === "loading" || status === "idle",
    isError: status === "failed",
  }
}

/** Whole-dataset order KPI aggregates (status/payment/channel counts, outstanding AR),
 * fetched once per session — for dashboard cards/stat strip that need true totals rather
 * than a last-100-orders sample. See `useRecentOrders()` for cards that need real row data. */
export function useOrderStats() {
  const stats = useAppSelector((state) => state.orders.orderStats)
  const status = useAppSelector((state) => state.orders.orderStatsStatus)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchOrderStatsThunk())
  }, [dispatch])

  return {
    stats,
    isLoading: status === "loading" || status === "idle",
    isError: status === "failed",
  }
}

/** Customer names ranked by total amount spent within the server's ranking window, fetched once per
 * session — for the order form's customer combobox suggestions, its top-5 "Top" badge, and
 * auto-filling Phone/shipping fields (via `customerDetailsByName`) when a suggestion is picked. */
export function useCustomerRankings() {
  const rankings = useAppSelector((state) => state.orders.customerRankings)
  const status = useAppSelector((state) => state.orders.customerRankingStatus)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchTopCustomersThunk())
  }, [dispatch])

  const customerNames = useMemo(() => rankings.map((ranking) => ranking.customerName), [rankings])
  const topCustomerNames = useMemo(
    () => new Set(rankings.slice(0, 5).map((ranking) => ranking.customerName)),
    [rankings]
  )
  const customerDetailsByName = useMemo(
    () => new Map(rankings.map((ranking) => [ranking.customerName, ranking])),
    [rankings]
  )

  return {
    customerNames,
    topCustomerNames,
    customerDetailsByName,
    isLoading: status === "loading" || status === "idle",
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

  /** Sets the Orders list page's filter params ahead of navigating there — e.g. a dashboard
   * widget linking to "unpaid orders" first primes the filter, then the caller navigates to /orders. */
  function setOrdersFilter(patch: Partial<OrdersQueryParams>) {
    dispatch(setOrdersParams({ ...DEFAULT_ORDERS_PARAMS, ...patch }))
  }

  return { addOrder, updateOrder, setOrderStatus, deleteOrder, setOrdersFilter }
}
