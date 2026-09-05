import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { LengthUnit } from "@/lib/length-units"
import type { PricingUnit, ProductCategory } from "@/lib/products"
import type { RootState } from "@/lib/store"
import type { StickerUnit } from "@/lib/sticker-quotation"

export const ORDER_STATUSES = [
  "pending",
  "layout",
  "trace",
  "print",
  "cut",
  "pack",
  "pickup",
  "released",
  "cancelled",
  "refunded",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

const LEGACY_STATUS_MAP: Partial<Record<string, OrderStatus>> = {
  confirmed: "layout",
  in_progress: "print",
  ready: "pickup",
  completed: "released",
}

export type SelectedOption = {
  optionId: string
  optionName: string
  value: string
}

export type OrderItemPricing =
  | {
      pricingType: "Package"
      pricingEntryId: string
      packageName: string
      unitPrice: number
      unit: PricingUnit
      size?: { width: number; height: number; unit: "in" | "cm" }
    }
  | {
      pricingType: "Per Unit"
      pricingEntryId: string
      unitPrice: number
      unit: PricingUnit
      // Only present when `unit` is area-based (e.g. "sq.ft."). Other per-unit pricing
      // (e.g. per "A4" sheet, per "piece") has no dimensions — total is just price × quantity.
      // Always in feet — this is what pricing math uses, not what the user typed.
      width?: number
      height?: number
      // The value + unit the user actually entered in the quotation form, before conversion
      // to feet for pricing math. Absent on orders saved before this field existed.
      displaySize?: { width: number; height: number; unit: LengthUnit }
    }
  | {
      pricingType: "Fixed"
      pricingEntryId: string
      unitPrice: number
      unit: PricingUnit
    }
  | {
      pricingType: "Manual"
      productName: string
      unitPrice: number
    }
  | {
      // Sintra "Custom size" mode — a form-level override that bypasses the
      // product's configured pricing entirely. thickness/back-to-back aren't stored
      // structurally (the backend whitelists a fixed set of pricing keys); they're
      // folded into `packageName` as a human-readable description instead — see
      // describeSintraCustom/parseSintraCustomDescription in sintra-board-pricing.ts.
      pricingType: "Custom"
      unitPrice: number
      unit: "in"
      width: number
      height: number
      packageName: string
    }

export type OrderItem = {
  id: string
  productId: string
  productName: string
  productCategory: ProductCategory
  selectedOptions: SelectedOption[]
  quantity: number
  notes: string
  pricing: OrderItemPricing
  lineTotal: number
  stickerQuotation: {
    package: string | null
    width: number
    height: number
    unit: StickerUnit
    quantity: number
    free?: number
  } | null
}

export type ShippingAddress = {
  name: string
  phone: string
  address: string
  fee: number
}

export const ORDER_CHANNELS = ["Facebook", "Shopee", "Walk-in"] as const
export type OrderChannel = (typeof ORDER_CHANNELS)[number]

export const PAYMENT_STATUSES = ["unpaid", "partially_paid", "paid"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_METHODS = ["GCash", "Maya", "Bank Transfer", "Cash"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export type Payment = {
  status: PaymentStatus
  method: PaymentMethod | null
  downPayment: number
  balance: number
}

export type Order = {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  discount: number
  additionalFees: number
  layoutFee: number
  total: number
  notes: string
  shippingAddress: ShippingAddress | null
  channel: OrderChannel
  payment: Payment
  createdAt: string
  updatedAt: string
  createdBy: string | null
  createdByName: string
  statusUpdatedBy: string | null
  statusUpdatedByName: string
  statusUpdatedAt: string | null
}

export type OrderInput = Omit<
  Order,
  | "id"
  | "orderNumber"
  | "createdAt"
  | "updatedAt"
  | "createdBy"
  | "createdByName"
  | "statusUpdatedBy"
  | "statusUpdatedByName"
  | "statusUpdatedAt"
>

// Fields only an admin/superadmin may include when updating an order (enforced
// server-side) — never sent on create, and never includes the *Name fields since
// those are always resolved live from the users list, never stored as a snapshot.
export type OrderAdminEditableFields = Pick<
  Order,
  "createdAt" | "createdBy" | "statusUpdatedAt" | "statusUpdatedBy"
>

export type OrderUpdateInput = Partial<OrderInput> & Partial<OrderAdminEditableFields>

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    status: LEGACY_STATUS_MAP[order.status] ?? order.status,
    channel: order.channel ?? "Walk-in",
    additionalFees: order.additionalFees ?? 0,
    layoutFee: order.layoutFee ?? 0,
    createdBy: order.createdBy ?? null,
    createdByName: order.createdByName ?? "",
    statusUpdatedBy: order.statusUpdatedBy ?? null,
    statusUpdatedByName: order.statusUpdatedByName ?? "",
    statusUpdatedAt: order.statusUpdatedAt ?? null,
    payment: order.payment ?? {
      status: "unpaid",
      method: null,
      downPayment: 0,
      balance: order.total,
    },
    shippingAddress: order.shippingAddress
      ? { ...order.shippingAddress, fee: order.shippingAddress.fee ?? 0 }
      : null,
    items: order.items.map((item) => ({
      ...item,
      stickerQuotation: item.stickerQuotation ?? null,
    })),
  }
}

export type OrdersQueryParams = {
  page: number
  pageSize: number
  search: string
  status: string
  paymentStatus: string
  category: string
  dateFrom: string
  dateTo: string
  sortBy: string
  sortDir: "asc" | "desc"
}

export const DEFAULT_ORDERS_PARAMS: OrdersQueryParams = {
  page: 1,
  pageSize: 10,
  search: "",
  status: "",
  paymentStatus: "",
  category: "",
  dateFrom: "",
  dateTo: "",
  sortBy: "created_at",
  sortDir: "desc",
}

export type OrdersListResponse = {
  items: Order[]
  total: number
  page: number
  pageSize: number
}

// One customer aggregated server-side over the ranking window (see CUSTOMER_RANKING_WINDOW_DAYS
// on the server) — powers the order form's customer combobox suggestions, top-5 badge, and
// auto-fill of Phone + shipping fields from the customer's most recent order.
export type CustomerRanking = {
  customerName: string
  customerPhone: string
  shippingAddress: ShippingAddress | null
  totalSpent: number
  orderCount: number
}

type CustomerRankingResponse = {
  customers: CustomerRanking[]
  windowDays: number
}

export const fetchOrdersThunk = createAsyncThunk<
  OrdersListResponse,
  OrdersQueryParams,
  { rejectValue: string; state: RootState }
>("orders/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<OrdersListResponse>("/orders", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search || undefined,
        status: params.status || undefined,
        paymentStatus: params.paymentStatus || undefined,
        category: params.category || undefined,
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      },
    })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const fetchOrderByIdThunk = createAsyncThunk<Order, string, { rejectValue: string }>(
  "orders/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get<Order>(`/orders/${id}`)
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

const HOT_PRODUCT_TOP_N = 5
const HOT_PRODUCT_MIN_ORDER_COUNT = 2

// Ranks products by how many of the latest 100 orders they appear in (breadth of demand,
// not summed quantity, so one bulk order doesn't outrank genuinely repeat-ordered products).
function computeHotProductIds(orders: Order[]): string[] {
  const counts = new Map<string, number>()
  for (const order of orders) {
    for (const item of order.items) {
      if (!item.productId) continue
      counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= HOT_PRODUCT_MIN_ORDER_COUNT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, HOT_PRODUCT_TOP_N)
    .map(([productId]) => productId)
}

export const fetchRecentOrdersForRankingThunk = createAsyncThunk<
  Order[],
  void,
  { rejectValue: string; state: RootState }
>(
  "orders/fetchRecentForRanking",
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get<OrdersListResponse>("/orders", {
        params: { limit: 100, sortBy: "created_at", sortDir: "desc" },
      })
      return data.items
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  },
  {
    condition: (_arg, { getState }) => getState().orders.rankingStatus === "idle",
  }
)

export const fetchTopCustomersThunk = createAsyncThunk<
  CustomerRanking[],
  void,
  { rejectValue: string; state: RootState }
>(
  "orders/fetchTopCustomers",
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get<CustomerRankingResponse>("/orders/customers/top")
      return data.customers
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  },
  {
    condition: (_arg, { getState }) => getState().orders.customerRankingStatus === "idle",
  }
)

export type OrderStats = {
  byStatus: Record<string, number>
  byPaymentStatus: Record<string, number>
  byChannel: Record<string, number>
  outstandingBalance: number
  totalOrders: number
}

/** Whole-dataset order KPI aggregates (status/payment/channel counts, outstanding AR) —
 * powers the dashboard's stat strip and breakdown cards without the last-100-orders cap
 * that `fetchRecentOrdersForRankingThunk` is subject to. */
export const fetchOrderStatsThunk = createAsyncThunk<
  OrderStats,
  void,
  { rejectValue: string; state: RootState }
>(
  "orders/fetchStats",
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get<OrderStats>("/orders/stats")
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  },
  {
    condition: (_arg, { getState }) => getState().orders.orderStatsStatus === "idle",
  }
)

// Unlike products, order items don't need their ids stripped before POSTing: the
// server always force-regenerates item ids on create, and reuses client-supplied
// item ids on update — which is exactly what's wanted so an edited item is upserted
// in place rather than deleted and recreated.
export const createOrderThunk = createAsyncThunk<Order, OrderInput, { rejectValue: string }>(
  "orders/create",
  async (input, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<Order>("/orders", input)
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const updateOrderThunk = createAsyncThunk<
  Order,
  { id: string; changes: OrderUpdateInput },
  { rejectValue: string }
>("orders/update", async ({ id, changes }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<Order>(`/orders/${id}`, changes)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteOrderThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "orders/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/orders/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

type OrdersState = {
  items: Order[]
  total: number
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
  latestRequestId: string | null
  params: OrdersQueryParams
  current: Order | null
  currentStatus: "idle" | "loading" | "succeeded" | "failed"
  currentError: string | null
  hotProductIds: string[]
  recentOrders: Order[]
  rankingStatus: "idle" | "loading" | "succeeded" | "failed"
  rankingError: string | null
  customerRankings: CustomerRanking[]
  customerRankingStatus: "idle" | "loading" | "succeeded" | "failed"
  customerRankingError: string | null
  orderStats: OrderStats | null
  orderStatsStatus: "idle" | "loading" | "succeeded" | "failed"
  orderStatsError: string | null
}

const initialState: OrdersState = {
  items: [],
  total: 0,
  status: "idle",
  error: null,
  latestRequestId: null,
  params: DEFAULT_ORDERS_PARAMS,
  current: null,
  currentStatus: "idle",
  currentError: null,
  hotProductIds: [],
  recentOrders: [],
  rankingStatus: "idle",
  rankingError: null,
  customerRankings: [],
  customerRankingStatus: "idle",
  customerRankingError: null,
  orderStats: null,
  orderStatsStatus: "idle",
  orderStatsError: null,
}

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    setOrdersParams(state, action: PayloadAction<Partial<OrdersQueryParams>>) {
      state.params = { ...state.params, ...action.payload }
    },
    /** Resets the three "fetch once per session" dashboard query statuses back to "idle" so their
     * thunks' `condition` (which skips re-fetching once a status leaves "idle") allows a re-fetch —
     * for the Dashboard page's manual refresh button. */
    markDashboardStale(state) {
      state.orderStatsStatus = "idle"
      state.rankingStatus = "idle"
      state.customerRankingStatus = "idle"
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchOrdersThunk.pending, (state, action) => {
        state.status = "loading"
        state.error = null
        state.latestRequestId = action.meta.requestId
      })
      .addCase(fetchOrdersThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "succeeded"
        state.items = action.payload.items.map(normalizeOrder)
        state.total = action.payload.total
      })
      .addCase(fetchOrdersThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "failed"
        state.error = action.payload ?? "Failed to load orders."
      })
      .addCase(fetchOrderByIdThunk.pending, (state) => {
        state.currentStatus = "loading"
        state.currentError = null
      })
      .addCase(fetchOrderByIdThunk.fulfilled, (state, action: PayloadAction<Order>) => {
        state.currentStatus = "succeeded"
        state.current = normalizeOrder(action.payload)
      })
      .addCase(fetchOrderByIdThunk.rejected, (state, action) => {
        state.currentStatus = "failed"
        state.currentError = action.payload ?? "Failed to load order."
      })
      .addCase(createOrderThunk.fulfilled, (state, action: PayloadAction<Order>) => {
        state.current = normalizeOrder(action.payload)
      })
      .addCase(updateOrderThunk.fulfilled, (state, action: PayloadAction<Order>) => {
        const normalized = normalizeOrder(action.payload)
        if (state.current?.id === action.payload.id) {
          state.current = normalized
        }
        const idx = state.items.findIndex((order) => order.id === action.payload.id)
        if (idx !== -1) {
          state.items[idx] = normalized
        }
      })
      .addCase(deleteOrderThunk.fulfilled, (state, action: PayloadAction<string>) => {
        if (state.current?.id === action.payload) {
          state.current = null
        }
      })
      .addCase(fetchRecentOrdersForRankingThunk.pending, (state) => {
        state.rankingStatus = "loading"
        state.rankingError = null
      })
      .addCase(fetchRecentOrdersForRankingThunk.fulfilled, (state, action: PayloadAction<Order[]>) => {
        state.rankingStatus = "succeeded"
        state.hotProductIds = computeHotProductIds(action.payload)
        state.recentOrders = action.payload.map(normalizeOrder)
      })
      .addCase(fetchRecentOrdersForRankingThunk.rejected, (state, action) => {
        state.rankingStatus = "failed"
        state.rankingError = action.payload ?? "Failed to load product rankings."
      })
      .addCase(fetchTopCustomersThunk.pending, (state) => {
        state.customerRankingStatus = "loading"
        state.customerRankingError = null
      })
      .addCase(fetchTopCustomersThunk.fulfilled, (state, action: PayloadAction<CustomerRanking[]>) => {
        state.customerRankingStatus = "succeeded"
        state.customerRankings = action.payload
      })
      .addCase(fetchTopCustomersThunk.rejected, (state, action) => {
        state.customerRankingStatus = "failed"
        state.customerRankingError = action.payload ?? "Failed to load customer rankings."
      })
      .addCase(fetchOrderStatsThunk.pending, (state) => {
        state.orderStatsStatus = "loading"
        state.orderStatsError = null
      })
      .addCase(fetchOrderStatsThunk.fulfilled, (state, action: PayloadAction<OrderStats>) => {
        state.orderStatsStatus = "succeeded"
        state.orderStats = action.payload
      })
      .addCase(fetchOrderStatsThunk.rejected, (state, action) => {
        state.orderStatsStatus = "failed"
        state.orderStatsError = action.payload ?? "Failed to load order stats."
      })
  },
})

export const { setOrdersParams, markDashboardStale } = ordersSlice.actions
export default ordersSlice.reducer
export type { OrdersState }
