import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"

export type PaymentMethodItem = {
  id: string
  name: string
  enabled: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const fetchPaymentMethodsThunk = createAsyncThunk<
  PaymentMethodItem[],
  void,
  { rejectValue: string }
>("paymentMethods/fetchAll", async (_arg, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<PaymentMethodItem[]>("/payment-methods")
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const createPaymentMethodThunk = createAsyncThunk<
  PaymentMethodItem,
  string,
  { rejectValue: string }
>("paymentMethods/create", async (name, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<PaymentMethodItem>("/payment-methods", { name })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const updatePaymentMethodThunk = createAsyncThunk<
  PaymentMethodItem,
  { id: string; input: { name?: string; enabled?: boolean } },
  { rejectValue: string }
>("paymentMethods/update", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<PaymentMethodItem>(`/payment-methods/${id}`, input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deletePaymentMethodThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "paymentMethods/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/payment-methods/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const reorderPaymentMethodsThunk = createAsyncThunk<
  PaymentMethodItem[],
  string[],
  { rejectValue: string }
>("paymentMethods/reorder", async (order, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<PaymentMethodItem[]>("/payment-methods/reorder", { order })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

type PaymentMethodsState = {
  items: PaymentMethodItem[]
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: PaymentMethodsState = {
  items: [],
  status: "idle",
  error: null,
}

const paymentMethodsSlice = createSlice({
  name: "paymentMethods",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchPaymentMethodsThunk.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchPaymentMethodsThunk.fulfilled, (state, action: PayloadAction<PaymentMethodItem[]>) => {
        state.status = "succeeded"
        state.items = action.payload
      })
      .addCase(fetchPaymentMethodsThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Failed to load payment methods."
      })
      .addCase(createPaymentMethodThunk.fulfilled, (state, action: PayloadAction<PaymentMethodItem>) => {
        state.items.push(action.payload)
      })
      .addCase(updatePaymentMethodThunk.fulfilled, (state, action: PayloadAction<PaymentMethodItem>) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deletePaymentMethodThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(reorderPaymentMethodsThunk.fulfilled, (state, action: PayloadAction<PaymentMethodItem[]>) => {
        state.items = action.payload
      })
  },
})

export default paymentMethodsSlice.reducer
export type { PaymentMethodsState }
