import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { generateId } from "@/lib/utils"

const PRODUCTS_STORAGE_KEY = "dgprints_products"

export const PRODUCT_CATEGORIES = [
  "Sticker Label",
  "Tarpaulin",
  "Sintra Board",
  "General Merchandise",
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

function seedProducts(): Product[] {
  const now = new Date().toISOString()
  return [
    {
      id: generateId(),
      name: "Sticker Label",
      category: "Sticker Label",
      description: "Custom printed sticker labels",
      status: "Active",
      options: [
        {
          id: generateId(),
          name: "Lamination",
          required: true,
          values: ["Non-Laminated", "Laminated"],
        },
        {
          id: generateId(),
          name: "Sticker Type",
          required: true,
          values: ["Glossy", "Matte", "Transparent"],
        },
      ],
      pricing: [
        {
          id: generateId(),
          appliesTo: ALL_VARIANTS,
          pricingType: "Package",
          packageName: "Package 1",
          price: 300,
          unit: "Package",
        },
        {
          id: generateId(),
          appliesTo: ALL_VARIANTS,
          pricingType: "Package",
          packageName: "Package 2",
          price: 500,
          unit: "Package",
        },
        {
          id: generateId(),
          appliesTo: ALL_VARIANTS,
          pricingType: "Package",
          packageName: "Package 3",
          price: 1000,
          unit: "Package",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: "Tarpaulin",
      category: "Tarpaulin",
      description: "Large format tarpaulin printing",
      status: "Active",
      options: [
        {
          id: generateId(),
          name: "Type of Tarp",
          required: true,
          values: ["Ordinary Glossy", "High Glossy"],
        },
      ],
      pricing: [
        {
          id: generateId(),
          appliesTo: "Ordinary Glossy",
          pricingType: "Per Unit",
          price: 30,
          unit: "sq.ft.",
        },
        {
          id: generateId(),
          appliesTo: "High Glossy",
          pricingType: "Per Unit",
          price: 35,
          unit: "sq.ft.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: "Sintra Board",
      category: "Sintra Board",
      description: "Rigid PVC board printing",
      status: "Active",
      options: [
        {
          id: generateId(),
          name: "Thickness",
          required: true,
          values: ["3mm", "5mm"],
        },
      ],
      pricing: [
        {
          id: generateId(),
          appliesTo: ALL_VARIANTS,
          pricingType: "Fixed",
          price: 180,
          unit: "A4",
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: "General Merchandise",
      category: "General Merchandise",
      description: "Other printed merchandise",
      status: "Active",
      options: [],
      pricing: [],
      createdAt: now,
      updatedAt: now,
    },
  ]
}

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

type ProductsState = {
  items: Product[]
}

function getInitialItems(): Product[] {
  const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY)
  if (stored) return JSON.parse(stored) as Product[]

  const seeded = seedProducts()
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

const initialState: ProductsState = {
  items: getInitialItems(),
}

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    productAdded: {
      reducer(state, action: PayloadAction<Product>) {
        state.items.push(action.payload)
      },
      prepare(input: ProductInput) {
        const now = new Date().toISOString()
        return { payload: { ...input, id: generateId(), createdAt: now, updatedAt: now } }
      },
    },
    productUpdated: {
      reducer(state, action: PayloadAction<{ id: string; input: ProductInput; updatedAt: string }>) {
        const { id, input, updatedAt } = action.payload
        const product = state.items.find((item) => item.id === id)
        if (product) {
          Object.assign(product, input, { updatedAt })
        }
      },
      prepare(id: string, input: ProductInput) {
        return { payload: { id, input, updatedAt: new Date().toISOString() } }
      },
    },
    productDeleted(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload)
    },
  },
})

export const { productAdded, productUpdated, productDeleted } = productsSlice.actions
export default productsSlice.reducer
export { PRODUCTS_STORAGE_KEY }
export type { ProductsState }
