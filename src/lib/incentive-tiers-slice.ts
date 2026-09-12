import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"

export type IncentiveTier = {
  id: string
  threshold: number
  amount: number
  createdAt: string
  updatedAt: string
}

export const fetchIncentiveTiersThunk = createAsyncThunk<IncentiveTier[], void, { rejectValue: string }>(
  "incentiveTiers/fetchAll",
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get<IncentiveTier[]>("/incentive-tiers")
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const createIncentiveTierThunk = createAsyncThunk<
  IncentiveTier,
  { threshold: number; amount: number },
  { rejectValue: string }
>("incentiveTiers/create", async (input, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<IncentiveTier>("/incentive-tiers", input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const updateIncentiveTierThunk = createAsyncThunk<
  IncentiveTier,
  { id: string; input: { threshold?: number; amount?: number } },
  { rejectValue: string }
>("incentiveTiers/update", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<IncentiveTier>(`/incentive-tiers/${id}`, input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteIncentiveTierThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "incentiveTiers/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/incentive-tiers/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

type IncentiveTiersState = {
  items: IncentiveTier[]
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: IncentiveTiersState = {
  items: [],
  status: "idle",
  error: null,
}

const incentiveTiersSlice = createSlice({
  name: "incentiveTiers",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchIncentiveTiersThunk.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchIncentiveTiersThunk.fulfilled, (state, action: PayloadAction<IncentiveTier[]>) => {
        state.status = "succeeded"
        state.items = action.payload
      })
      .addCase(fetchIncentiveTiersThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Failed to load incentive tiers."
      })
      .addCase(createIncentiveTierThunk.fulfilled, (state, action: PayloadAction<IncentiveTier>) => {
        state.items.push(action.payload)
        state.items.sort((a, b) => a.threshold - b.threshold)
      })
      .addCase(updateIncentiveTierThunk.fulfilled, (state, action: PayloadAction<IncentiveTier>) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
        state.items.sort((a, b) => a.threshold - b.threshold)
      })
      .addCase(deleteIncentiveTierThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
  },
})

export default incentiveTiersSlice.reducer
export type { IncentiveTiersState }
