import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { PricingUnit, ProductCategory } from "@/lib/products"

export const ORDERS_STORAGE_KEY = "dgprints_orders"

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

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
  total: number
  notes: string
  createdAt: string
  updatedAt: string
}

export type OrderInput = Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">

type OrdersState = {
  items: Order[]
}

function getInitialOrders(): Order[] {
  try {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
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
