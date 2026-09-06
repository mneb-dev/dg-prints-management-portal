import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"

export type AppSettings = {
  shippingFee: number
  updatedAt: string
}

export type AppSettingsInput = {
  shippingFee: number
}

export const fetchSettingsThunk = createAsyncThunk<AppSettings, void, { rejectValue: string }>(
  "settings/fetch",
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get<AppSettings>("/settings")
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const updateSettingsThunk = createAsyncThunk<
  AppSettings,
  AppSettingsInput,
  { rejectValue: string }
>("settings/update", async (input, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<AppSettings>("/settings", input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

type SettingsState = {
  data: AppSettings | null
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: SettingsState = {
  data: null,
  status: "idle",
  error: null,
}

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchSettingsThunk.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchSettingsThunk.fulfilled, (state, action: PayloadAction<AppSettings>) => {
        state.status = "succeeded"
        state.data = action.payload
      })
      .addCase(fetchSettingsThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Failed to load settings."
      })
      .addCase(updateSettingsThunk.fulfilled, (state, action: PayloadAction<AppSettings>) => {
        state.status = "succeeded"
        state.data = action.payload
      })
  },
})

export default settingsSlice.reducer
export type { SettingsState }
