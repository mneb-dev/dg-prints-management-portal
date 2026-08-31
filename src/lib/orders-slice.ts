import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
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
      width?: number
      height?: number
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
      // Sintra Board "Custom size" mode — a form-level override that bypasses the
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
  description: string
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

export type OrdersListResponse = {
  items: Order[]
  total: number
  page: number
  pageSize: number
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
}

const initialState: OrdersState = {
  items: [],
  total: 0,
  status: "idle",
  error: null,
  latestRequestId: null,
  params: {
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
  },
  current: null,
  currentStatus: "idle",
  currentError: null,
}

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    setOrdersParams(state, action: PayloadAction<Partial<OrdersQueryParams>>) {
      state.params = { ...state.params, ...action.payload }
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
  },
})

export const { setOrdersParams } = ordersSlice.actions
export default ordersSlice.reducer
export type { OrdersState }
