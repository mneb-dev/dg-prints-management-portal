import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { PricingUnit, ProductCategory } from "@/lib/products"
import type { RootState } from "@/lib/store"
import type { StickerQuotation, StickerUnit } from "@/lib/sticker-quotation"

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
    package: keyof StickerQuotation
    width: number
    height: number
    unit: StickerUnit
    quantity: number
    free: number
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
  total: number
  notes: string
  shippingAddress: ShippingAddress | null
  channel: OrderChannel
  payment: Payment
  createdAt: string
  updatedAt: string
}

export type OrderInput = Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    status: LEGACY_STATUS_MAP[order.status] ?? order.status,
    channel: order.channel ?? "Walk-in",
    additionalFees: order.additionalFees ?? 0,
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

export const fetchOrdersThunk = createAsyncThunk<
  Order[],
  void,
  { rejectValue: string; state: RootState }
>("orders/fetchAll", async (_arg, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<Order[]>("/orders")
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
}, {
  condition: (_arg, { getState }) => getState().orders.status === "idle",
})

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
  { id: string; changes: Partial<OrderInput> },
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
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: OrdersState = {
  items: [],
  status: "idle",
  error: null,
}

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchOrdersThunk.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchOrdersThunk.fulfilled, (state, action: PayloadAction<Order[]>) => {
        state.status = "succeeded"
        state.items = action.payload.map(normalizeOrder)
      })
      .addCase(fetchOrdersThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Failed to load orders."
      })
      .addCase(createOrderThunk.fulfilled, (state, action: PayloadAction<Order>) => {
        state.items.push(normalizeOrder(action.payload))
      })
      .addCase(updateOrderThunk.fulfilled, (state, action: PayloadAction<Order>) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = normalizeOrder(action.payload)
      })
      .addCase(deleteOrderThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
  },
})

export default ordersSlice.reducer
export type { OrdersState }
