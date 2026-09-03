import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { RootState } from "@/lib/store"

/**
 * The categories originally hardcoded here, before categories became an
 * admin-managed entity (see @/lib/categories). Kept only as the key-set for
 * the default icon/tone/status-flow lookups — not used to populate pickers.
 */
export const KNOWN_PRODUCT_CATEGORIES = [
  "Sticker Label",
  "Laminated Sticker",
  "Tarpaulin",
  "Sintra Board",
  "General Merchandise",
  "3D Print",
] as const
export type ProductCategory = string

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

export type ProductsQueryParams = {
  page: number
  pageSize: number
  search: string
  category: string
  status: string
  pricingType: string
  sortBy: string
  sortDir: "asc" | "desc"
}

export type ProductsListResponse = {
  items: Product[]
  total: number
  page: number
  pageSize: number | null
}

export const fetchProductsThunk = createAsyncThunk<
  ProductsListResponse,
  ProductsQueryParams,
  { rejectValue: string; state: RootState }
>("products/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<ProductsListResponse>("/products", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search || undefined,
        category: params.category || undefined,
        status: params.status || undefined,
        pricingType: params.pricingType || undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      },
    })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const fetchAllProductsThunk = createAsyncThunk<
  Product[],
  void,
  { rejectValue: string; state: RootState }
>("products/fetchAllCatalog", async (_arg, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<ProductsListResponse>("/products", {
      params: { all: true },
    })
    return data.items
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
}, {
  condition: (_arg, { getState }) => getState().products.catalogStatus === "idle",
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
  total: number
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
  latestRequestId: string | null
  params: ProductsQueryParams
  catalog: Product[]
  catalogStatus: "idle" | "loading" | "succeeded" | "failed"
  catalogError: string | null
}

const initialState: ProductsState = {
  items: [],
  total: 0,
  status: "idle",
  error: null,
  latestRequestId: null,
  params: {
    page: 1,
    pageSize: 10,
    search: "",
    category: "",
    status: "",
    pricingType: "",
    sortBy: "created_at",
    sortDir: "asc",
  },
  catalog: [],
  catalogStatus: "idle",
  catalogError: null,
}

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProductsParams(state, action: PayloadAction<Partial<ProductsQueryParams>>) {
      state.params = { ...state.params, ...action.payload }
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchProductsThunk.pending, (state, action) => {
        state.status = "loading"
        state.error = null
        state.latestRequestId = action.meta.requestId
      })
      .addCase(fetchProductsThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "succeeded"
        state.items = action.payload.items
        state.total = action.payload.total
      })
      .addCase(fetchProductsThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "failed"
        state.error = action.payload ?? "Failed to load products."
      })
      .addCase(fetchAllProductsThunk.pending, (state) => {
        state.catalogStatus = "loading"
        state.catalogError = null
      })
      .addCase(fetchAllProductsThunk.fulfilled, (state, action: PayloadAction<Product[]>) => {
        state.catalogStatus = "succeeded"
        state.catalog = action.payload
      })
      .addCase(fetchAllProductsThunk.rejected, (state, action) => {
        state.catalogStatus = "failed"
        state.catalogError = action.payload ?? "Failed to load products."
      })
      .addCase(createProductThunk.fulfilled, (state, action: PayloadAction<Product>) => {
        state.catalog.push(action.payload)
      })
      .addCase(updateProductThunk.fulfilled, (state, action: PayloadAction<Product>) => {
        const index = state.catalog.findIndex((item) => item.id === action.payload.id)
        if (index !== -1) state.catalog[index] = action.payload
      })
      .addCase(deleteProductThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.catalog = state.catalog.filter((item) => item.id !== action.payload)
      })
  },
})

export const { setProductsParams } = productsSlice.actions
export default productsSlice.reducer
export type { ProductsState }
