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

export type MonthlyIncentiveTier = {
  threshold: number
  amount: number
  progressPercent: number
  isMet: boolean
}

export type MonthlyIncentiveStaffShare = {
  userId: string
  name: string
  ownSales: number
  percentageShare: number
  commissionShare: number
}

export type MonthlyIncentiveOwnShare = {
  ownSales: number
  percentageShare: number
  commissionShare: number
}

export type MonthlyIncentiveSummary = {
  totalStaffSales: number
  pool: number
  tiers: MonthlyIncentiveTier[]
  perStaff: MonthlyIncentiveStaffShare[]
  /** The calling user's own row, regardless of role -- populated even when perStaff is stripped
   * for a staff caller. Null when the caller has no eligible sales in the period. */
  ownShare: MonthlyIncentiveOwnShare | null
  releasedAt: string | null
  releasedBy: string | null
  releasedByName: string | null
}

export type MonthlyIncentiveHistoryEntry = {
  periodMonth: string
  totalStaffSales: number
  pool: number
  releasedAt: string | null
  releasedBy: string | null
  releasedByName: string | null
  /** The one month release_monthly_incentive always refuses -- its sales total isn't final yet. */
  isCurrentMonth: boolean
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

export const fetchMonthlyIncentiveSummaryThunk = createAsyncThunk<
  MonthlyIncentiveSummary,
  { dateFrom: string; dateTo: string },
  { rejectValue: string; state: RootState }
>("commission/fetchMonthlyIncentiveSummary", async ({ dateFrom, dateTo }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<MonthlyIncentiveSummary>("/commissions/monthly-incentive-summary", {
      params: { dateFrom, dateTo },
    })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

// Separate action type (and separate state slot below) from fetchMonthlyIncentiveSummaryThunk
// even though it hits the same endpoint -- lets the current-month and previous-month periods be
// in flight/cached independently instead of one dispatch overwriting the other's slot.
export const fetchPreviousMonthlyIncentiveSummaryThunk = createAsyncThunk<
  MonthlyIncentiveSummary,
  { dateFrom: string; dateTo: string },
  { rejectValue: string; state: RootState }
>("commission/fetchPreviousMonthlyIncentiveSummary", async ({ dateFrom, dateTo }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<MonthlyIncentiveSummary>("/commissions/monthly-incentive-summary", {
      params: { dateFrom, dateTo },
    })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const releaseMonthlyIncentiveThunk = createAsyncThunk<
  { releaseId: string; periodMonth: string },
  { dateFrom: string; dateTo: string },
  { rejectValue: string; state: RootState }
>("commission/releaseMonthlyIncentive", async ({ dateFrom, dateTo }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<{ releaseId: string; periodMonth: string }>(
      "/commissions/monthly-incentive-summary/release",
      { dateFrom, dateTo }
    )
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const unreleaseMonthlyIncentiveThunk = createAsyncThunk<
  { unreleased: boolean; periodMonth: string | null },
  { dateFrom: string; dateTo: string },
  { rejectValue: string; state: RootState }
>("commission/unreleaseMonthlyIncentive", async ({ dateFrom, dateTo }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<{ unreleased: boolean; periodMonth: string | null }>(
      "/commissions/monthly-incentive-summary/unrelease",
      { dateFrom, dateTo }
    )
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const fetchMonthlyIncentiveHistoryThunk = createAsyncThunk<
  MonthlyIncentiveHistoryEntry[],
  { year: number },
  { rejectValue: string; state: RootState }
>("commission/fetchMonthlyIncentiveHistory", async ({ year }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<{ rows: MonthlyIncentiveHistoryEntry[] }>(
      "/commissions/monthly-incentive-summary/history",
      { params: { year } }
    )
    return data.rows
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
  monthlyIncentive: MonthlyIncentiveSummary | null
  monthlyIncentiveStatus: "idle" | "loading" | "succeeded" | "failed"
  monthlyIncentiveError: string | null
  latestMonthlyIncentiveRequestId: string | null
  monthlyIncentivePrevious: MonthlyIncentiveSummary | null
  monthlyIncentivePreviousStatus: "idle" | "loading" | "succeeded" | "failed"
  monthlyIncentivePreviousError: string | null
  latestMonthlyIncentivePreviousRequestId: string | null
  incentiveHistory: MonthlyIncentiveHistoryEntry[]
  incentiveHistoryStatus: "idle" | "loading" | "succeeded" | "failed"
  incentiveHistoryError: string | null
  latestIncentiveHistoryRequestId: string | null
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
  monthlyIncentive: null,
  monthlyIncentiveStatus: "idle",
  monthlyIncentiveError: null,
  latestMonthlyIncentiveRequestId: null,
  monthlyIncentivePrevious: null,
  monthlyIncentivePreviousStatus: "idle",
  monthlyIncentivePreviousError: null,
  latestMonthlyIncentivePreviousRequestId: null,
  incentiveHistory: [],
  incentiveHistoryStatus: "idle",
  incentiveHistoryError: null,
  latestIncentiveHistoryRequestId: null,
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
      .addCase(fetchMonthlyIncentiveSummaryThunk.pending, (state, action) => {
        state.monthlyIncentiveStatus = "loading"
        state.monthlyIncentiveError = null
        state.latestMonthlyIncentiveRequestId = action.meta.requestId
      })
      .addCase(fetchMonthlyIncentiveSummaryThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestMonthlyIncentiveRequestId) return
        state.monthlyIncentiveStatus = "succeeded"
        state.monthlyIncentive = action.payload
      })
      .addCase(fetchMonthlyIncentiveSummaryThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestMonthlyIncentiveRequestId) return
        state.monthlyIncentiveStatus = "failed"
        state.monthlyIncentiveError = action.payload ?? "Failed to load monthly incentive summary."
      })
      .addCase(fetchPreviousMonthlyIncentiveSummaryThunk.pending, (state, action) => {
        state.monthlyIncentivePreviousStatus = "loading"
        state.monthlyIncentivePreviousError = null
        state.latestMonthlyIncentivePreviousRequestId = action.meta.requestId
      })
      .addCase(fetchPreviousMonthlyIncentiveSummaryThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestMonthlyIncentivePreviousRequestId) return
        state.monthlyIncentivePreviousStatus = "succeeded"
        state.monthlyIncentivePrevious = action.payload
      })
      .addCase(fetchPreviousMonthlyIncentiveSummaryThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestMonthlyIncentivePreviousRequestId) return
        state.monthlyIncentivePreviousStatus = "failed"
        state.monthlyIncentivePreviousError = action.payload ?? "Failed to load last month's incentive summary."
      })
      .addCase(fetchMonthlyIncentiveHistoryThunk.pending, (state, action) => {
        state.incentiveHistoryStatus = "loading"
        state.incentiveHistoryError = null
        state.latestIncentiveHistoryRequestId = action.meta.requestId
      })
      .addCase(fetchMonthlyIncentiveHistoryThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestIncentiveHistoryRequestId) return
        state.incentiveHistoryStatus = "succeeded"
        state.incentiveHistory = action.payload
      })
      .addCase(fetchMonthlyIncentiveHistoryThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestIncentiveHistoryRequestId) return
        state.incentiveHistoryStatus = "failed"
        state.incentiveHistoryError = action.payload ?? "Failed to load the incentive release history."
      })
  },
})

export default commissionSlice.reducer
export type { CommissionState }
