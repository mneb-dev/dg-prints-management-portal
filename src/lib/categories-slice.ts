import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { OrderStatus } from "@/lib/orders-slice"

export type Category = {
  id: string
  name: string
  active: boolean
  statusFlow: OrderStatus[]
  createdAt: string
  updatedAt: string
}

export type CategoryInput = {
  name: string
  active: boolean
  statusFlow: OrderStatus[]
}

export const fetchCategoriesThunk = createAsyncThunk<Category[], void, { rejectValue: string }>(
  "categories/fetchAll",
  async (_arg, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get<Category[]>("/categories")
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const createCategoryThunk = createAsyncThunk<Category, CategoryInput, { rejectValue: string }>(
  "categories/create",
  async (input, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<Category>("/categories", input)
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const updateCategoryThunk = createAsyncThunk<
  Category,
  { id: string; input: CategoryInput },
  { rejectValue: string }
>("categories/update", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<Category>(`/categories/${id}`, input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteCategoryThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "categories/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/categories/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

type CategoriesState = {
  items: Category[]
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: CategoriesState = {
  items: [],
  status: "idle",
  error: null,
}

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchCategoriesThunk.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchCategoriesThunk.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.status = "succeeded"
        state.items = action.payload
      })
      .addCase(fetchCategoriesThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Failed to load categories."
      })
      .addCase(createCategoryThunk.fulfilled, (state, action: PayloadAction<Category>) => {
        state.items.push(action.payload)
      })
      .addCase(updateCategoryThunk.fulfilled, (state, action: PayloadAction<Category>) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteCategoryThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
  },
})

export default categoriesSlice.reducer
export type { CategoriesState }
