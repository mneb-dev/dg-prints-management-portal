import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { RootState } from "@/lib/store"

export type FinanceSeriesPoint = { date: string; revenue: number; expenses: number }

export type FinanceSummary = {
  range: { from: string; to: string }
  totalRevenue: number
  revenueOrderCount: number
  totalExpenses: number
  expenseCount: number
  netProfit: number
  outstandingBalance: number
  expensesByCategory: Record<string, number>
  revenueByChannel: Record<string, number>
  revenueByPaymentMethod: Record<string, number>
  series: FinanceSeriesPoint[]
}

export const fetchFinanceSummaryThunk = createAsyncThunk<
  FinanceSummary,
  { dateFrom: string; dateTo: string },
  { rejectValue: string; state: RootState }
>("finance/fetchSummary", async ({ dateFrom, dateTo }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<FinanceSummary>("/finance/summary", {
      params: { dateFrom, dateTo },
    })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

type FinanceState = {
  summary: FinanceSummary | null
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
  latestRequestId: string | null
}

const initialState: FinanceState = {
  summary: null,
  status: "idle",
  error: null,
  latestRequestId: null,
}

const financeSlice = createSlice({
  name: "finance",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchFinanceSummaryThunk.pending, (state, action) => {
        state.status = "loading"
        state.error = null
        state.latestRequestId = action.meta.requestId
      })
      .addCase(fetchFinanceSummaryThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "succeeded"
        state.summary = action.payload
      })
      .addCase(fetchFinanceSummaryThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "failed"
        state.error = action.payload ?? "Failed to load finance summary."
      })
  },
})

export default financeSlice.reducer
export type { FinanceState }
