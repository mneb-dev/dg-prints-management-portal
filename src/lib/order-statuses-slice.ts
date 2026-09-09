import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"

export type OrderStatusItem = {
  id: string
  name: string
  label: string
  icon: string
  color: string
  protected: boolean
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type OrderStatusInput = {
  name: string
  label: string
  icon?: string
  color?: string
}

export const fetchOrderStatusesThunk = createAsyncThunk<
  OrderStatusItem[],
  void,
  { rejectValue: string }
>("orderStatuses/fetchAll", async (_arg, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<OrderStatusItem[]>("/order-statuses")
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const createOrderStatusThunk = createAsyncThunk<
  OrderStatusItem,
  OrderStatusInput,
  { rejectValue: string }
>("orderStatuses/create", async (input, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<OrderStatusItem>("/order-statuses", input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const updateOrderStatusThunk = createAsyncThunk<
  OrderStatusItem,
  {
    id: string
    input: { name?: string; label?: string; icon?: string; color?: string; enabled?: boolean }
  },
  { rejectValue: string }
>("orderStatuses/update", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<OrderStatusItem>(`/order-statuses/${id}`, input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteOrderStatusThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "orderStatuses/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/order-statuses/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const reorderOrderStatusesThunk = createAsyncThunk<
  OrderStatusItem[],
  string[],
  { rejectValue: string }
>("orderStatuses/reorder", async (order, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<OrderStatusItem[]>("/order-statuses/reorder", { order })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

type OrderStatusesState = {
  items: OrderStatusItem[]
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: OrderStatusesState = {
  items: [],
  status: "idle",
  error: null,
}

const orderStatusesSlice = createSlice({
  name: "orderStatuses",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchOrderStatusesThunk.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchOrderStatusesThunk.fulfilled, (state, action: PayloadAction<OrderStatusItem[]>) => {
        state.status = "succeeded"
        state.items = action.payload
      })
      .addCase(fetchOrderStatusesThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Failed to load order statuses."
      })
      .addCase(createOrderStatusThunk.fulfilled, (state, action: PayloadAction<OrderStatusItem>) => {
        state.items.push(action.payload)
      })
      .addCase(updateOrderStatusThunk.fulfilled, (state, action: PayloadAction<OrderStatusItem>) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteOrderStatusThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(reorderOrderStatusesThunk.fulfilled, (state, action: PayloadAction<OrderStatusItem[]>) => {
        state.items = action.payload
      })
  },
})

export default orderStatusesSlice.reducer
export type { OrderStatusesState }
