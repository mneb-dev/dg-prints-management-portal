import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { PeriodPreset } from "@/lib/finance-period"
import type { PaymentStatus } from "@/lib/orders-slice"
import type { RootState } from "@/lib/store"

export type CommissionSummaryRow = {
  layoutBy: string
  layoutByName: string
  paidCommission: number
  paidOrderCount: number
  unpaidCommission: number
  unpaidOrderCount: number
  totalCommission: number
  totalOrderCount: number
  releasedCommission: number
  releasedOrderCount: number
  pendingReleaseCommission: number
  pendingReleaseOrderCount: number
}

export type CommissionOrderRow = {
  id: string
  orderNumber: string
  customerName: string
  layoutFee: number
  commissionRate: number
  commissionAmount: number
  paymentStatus: PaymentStatus
  layoutBy: string
  layoutByName: string
  createdAt: string
  releasedAt: string | null
  releasedBy: string | null
  releasedByName: string | null
}

// Staff are restricted to short, coarse windows -- no custom range and no multi-month lookback --
// same restriction (and same reasoning) as the Sales Overview chart's STAFF_PRESETS.
export const STAFF_COMMISSION_PRESETS: PeriodPreset[] = ["this_week", "this_month"]

export const fetchCommissionSummaryThunk = createAsyncThunk<
  CommissionSummaryRow[],
  { dateFrom: string; dateTo: string; layoutBy?: string },
  { rejectValue: string; state: RootState }
>("commission/fetchSummary", async ({ dateFrom, dateTo, layoutBy }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<{ rows: CommissionSummaryRow[] }>("/commissions/summary", {
      params: { dateFrom, dateTo, layoutBy: layoutBy || undefined },
    })
    return data.rows
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const fetchCommissionOrdersThunk = createAsyncThunk<
  CommissionOrderRow[],
  { dateFrom: string; dateTo: string; layoutBy?: string },
  { rejectValue: string; state: RootState }
>("commission/fetchOrders", async ({ dateFrom, dateTo, layoutBy }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<{ rows: CommissionOrderRow[] }>("/commissions/orders", {
      params: { dateFrom, dateTo, layoutBy: layoutBy || undefined },
    })
    return data.rows
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const releaseCommissionOrdersThunk = createAsyncThunk<
  string[],
  string[],
  { rejectValue: string; state: RootState }
>("commission/release", async (orderIds, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<{ releasedIds: string[] }>("/commissions/release", { orderIds })
    return data.releasedIds
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const unreleaseCommissionOrdersThunk = createAsyncThunk<
  string[],
  string[],
  { rejectValue: string; state: RootState }
>("commission/unrelease", async (orderIds, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<{ unreleasedIds: string[] }>("/commissions/unrelease", { orderIds })
    return data.unreleasedIds
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

type CommissionState = {
  rows: CommissionSummaryRow[]
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
  latestRequestId: string | null
  orderRows: CommissionOrderRow[]
  orderStatus: "idle" | "loading" | "succeeded" | "failed"
  orderError: string | null
  latestOrdersRequestId: string | null
}

const initialState: CommissionState = {
  rows: [],
  status: "idle",
  error: null,
  latestRequestId: null,
  orderRows: [],
  orderStatus: "idle",
  orderError: null,
  latestOrdersRequestId: null,
}

const commissionSlice = createSlice({
  name: "commission",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchCommissionSummaryThunk.pending, (state, action) => {
        state.status = "loading"
        state.error = null
        state.latestRequestId = action.meta.requestId
      })
      .addCase(fetchCommissionSummaryThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "succeeded"
        state.rows = action.payload
      })
      .addCase(fetchCommissionSummaryThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "failed"
        state.error = action.payload ?? "Failed to load commission summary."
      })
      .addCase(fetchCommissionOrdersThunk.pending, (state, action) => {
        state.orderStatus = "loading"
        state.orderError = null
        state.latestOrdersRequestId = action.meta.requestId
      })
      .addCase(fetchCommissionOrdersThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestOrdersRequestId) return
        state.orderStatus = "succeeded"
        state.orderRows = action.payload
      })
      .addCase(fetchCommissionOrdersThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestOrdersRequestId) return
        state.orderStatus = "failed"
        state.orderError = action.payload ?? "Failed to load commission orders."
      })
  },
})

export default commissionSlice.reducer
export type { CommissionState }
