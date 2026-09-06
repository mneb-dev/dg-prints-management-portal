import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"

export type OrderChannelItem = {
  id: string
  name: string
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const fetchOrderChannelsThunk = createAsyncThunk<
  OrderChannelItem[],
  void,
  { rejectValue: string }
>("orderChannels/fetchAll", async (_arg, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<OrderChannelItem[]>("/order-channels")
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const createOrderChannelThunk = createAsyncThunk<
  OrderChannelItem,
  string,
  { rejectValue: string }
>("orderChannels/create", async (name, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<OrderChannelItem>("/order-channels", { name })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const updateOrderChannelThunk = createAsyncThunk<
  OrderChannelItem,
  { id: string; input: { name?: string; enabled?: boolean } },
  { rejectValue: string }
>("orderChannels/update", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<OrderChannelItem>(`/order-channels/${id}`, input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteOrderChannelThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "orderChannels/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/order-channels/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const reorderOrderChannelsThunk = createAsyncThunk<
  OrderChannelItem[],
  string[],
  { rejectValue: string }
>("orderChannels/reorder", async (order, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<OrderChannelItem[]>("/order-channels/reorder", { order })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

type OrderChannelsState = {
  items: OrderChannelItem[]
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: OrderChannelsState = {
  items: [],
  status: "idle",
  error: null,
}

const orderChannelsSlice = createSlice({
  name: "orderChannels",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchOrderChannelsThunk.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchOrderChannelsThunk.fulfilled, (state, action: PayloadAction<OrderChannelItem[]>) => {
        state.status = "succeeded"
        state.items = action.payload
      })
      .addCase(fetchOrderChannelsThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Failed to load order channels."
      })
      .addCase(createOrderChannelThunk.fulfilled, (state, action: PayloadAction<OrderChannelItem>) => {
        state.items.push(action.payload)
      })
      .addCase(updateOrderChannelThunk.fulfilled, (state, action: PayloadAction<OrderChannelItem>) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteOrderChannelThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(reorderOrderChannelsThunk.fulfilled, (state, action: PayloadAction<OrderChannelItem[]>) => {
        state.items = action.payload
      })
  },
})

export default orderChannelsSlice.reducer
export type { OrderChannelsState }
