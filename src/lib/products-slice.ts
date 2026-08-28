import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { RootState } from "@/lib/store"

export const PRODUCT_CATEGORIES = [
  "Sticker Label",
  "Tarpaulin",
  "Sintra Board",
  "General Merchandise",
  "3D Print",
] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const PRODUCT_STATUSES = ["Active", "Inactive"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const PRICING_TYPES = ["Package", "Per Unit", "Fixed"] as const
export type PricingType = (typeof PRICING_TYPES)[number]

export const PRICING_UNITS = ["Package", "sq.ft.", "A4", "piece"] as const
export type PricingUnit = (typeof PRICING_UNITS)[number]

/** Sentinel `appliesTo` value for products with no options, or a price that applies regardless of variant. */
export const ALL_VARIANTS = "All"

export type ProductOption = {
  id: string
  name: string
  required: boolean
  values: string[]
}

export type PricingEntry = {
  id: string
  appliesTo: string
  pricingType: PricingType
  packageName?: string
  price: number
  unit: PricingUnit
}

export type Product = {
  id: string
  name: string
  category: ProductCategory
  description: string
  status: ProductStatus
  options: ProductOption[]
  pricing: PricingEntry[]
  createdAt: string
  updatedAt: string
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">

export function summarizePricing(pricing: PricingEntry[]): string {
  if (pricing.length === 0) return "No pricing"

  const types = new Set(pricing.map((entry) => entry.pricingType))
  if (types.size > 1) return "Mixed"

  const [type] = types
  if (type === "Per Unit") {
    const units = new Set(pricing.map((entry) => entry.unit))
    return units.size === 1 ? `Per ${pricing[0].unit}` : "Per Unit"
  }

  return type
}

function toProductPayload(input: ProductInput) {
  return {
    ...input,
    options: input.options.map(({ id: _id, ...rest }) => rest),
    pricing: input.pricing.map(({ id: _id, ...rest }) => rest),
  }
}

export const fetchProductsThunk = createAsyncThunk<
  Product[],
  void,
  { rejectValue: string; state: RootState }
>("products/fetchAll", async (_arg, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<Product[]>("/products")
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
}, {
  condition: (_arg, { getState }) => getState().products.status === "idle",
})

export const createProductThunk = createAsyncThunk<Product, ProductInput, { rejectValue: string }>(
  "products/create",
  async (input, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<Product>("/products", toProductPayload(input))
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const updateProductThunk = createAsyncThunk<
  Product,
  { id: string; input: ProductInput },
  { rejectValue: string }
>("products/update", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<Product>(`/products/${id}`, toProductPayload(input))
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteProductThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "products/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/products/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

type ProductsState = {
  items: Product[]
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: ProductsState = {
  items: [],
  status: "idle",
  error: null,
}

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchProductsThunk.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchProductsThunk.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.status = "succeeded"
        state.items = action.payload
      })
      .addCase(fetchProductsThunk.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Failed to load products."
      })
      .addCase(createProductThunk.fulfilled, (state, action: PayloadAction<Product>) => {
        state.items.push(action.payload)
      })
      .addCase(updateProductThunk.fulfilled, (state, action: PayloadAction<Product>) => {
        const index = state.items.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(deleteProductThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
  },
})

export default productsSlice.reducer
export type { ProductsState }
