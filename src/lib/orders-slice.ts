import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { PricingUnit, ProductCategory } from "@/lib/products"
import type { StickerQuotation, StickerUnit } from "@/lib/sticker-quotation"

export const ORDERS_STORAGE_KEY = "dgprints_orders"

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

type OrdersState = {
  items: Order[]
}

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

function getInitialOrders(): Order[] {
  try {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed.map(normalizeOrder) : []
  } catch {
    return []
  }
}

const initialState: OrdersState = {
  items: getInitialOrders(),
}

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    orderAdded: {
      reducer(state, action: PayloadAction<Order>) {
        state.items.push(action.payload)
      },
      prepare(order: Omit<Order, "createdAt" | "updatedAt">) {
        const now = new Date().toISOString()
        return { payload: { ...order, createdAt: now, updatedAt: now } }
      },
    },
    orderUpdated: {
      reducer(state, action: PayloadAction<{ id: string; changes: Partial<Order> }>) {
        const index = state.items.findIndex((order) => order.id === action.payload.id)
        if (index !== -1) {
          state.items[index] = {
            ...state.items[index],
            ...action.payload.changes,
            updatedAt: new Date().toISOString(),
          }
        }
      },
      prepare(id: string, changes: Partial<Order>) {
        return { payload: { id, changes } }
      },
    },
    orderStatusChanged: {
      reducer(state, action: PayloadAction<{ id: string; status: OrderStatus }>) {
        const index = state.items.findIndex((order) => order.id === action.payload.id)
        if (index !== -1) {
          state.items[index].status = action.payload.status
          state.items[index].updatedAt = new Date().toISOString()
        }
      },
      prepare(id: string, status: OrderStatus) {
        return { payload: { id, status } }
      },
    },
    orderDeleted(state, action: PayloadAction<string>) {
      state.items = state.items.filter((order) => order.id !== action.payload)
    },
  },
})

export const { orderAdded, orderUpdated, orderStatusChanged, orderDeleted } = ordersSlice.actions
export default ordersSlice.reducer
export type { OrdersState }
