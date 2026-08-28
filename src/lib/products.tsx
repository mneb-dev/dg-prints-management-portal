import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createProductThunk,
  deleteProductThunk,
  fetchProductsThunk,
  updateProductThunk,
} from "@/lib/products-slice"
import type { ProductInput } from "@/lib/products-slice"

export {
  ALL_VARIANTS,
  PRICING_TYPES,
  PRICING_UNITS,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  summarizePricing,
} from "@/lib/products-slice"
export type {
  PricingEntry,
  PricingType,
  PricingUnit,
  Product,
  ProductCategory,
  ProductInput,
  ProductOption,
  ProductStatus,
} from "@/lib/products-slice"

export function useProducts() {
  const products = useAppSelector((state) => state.products.items)
  const status = useAppSelector((state) => state.products.status)
  const error = useAppSelector((state) => state.products.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchProductsThunk())
  }, [dispatch])

  async function addProduct(input: ProductInput) {
    await dispatch(createProductThunk(input)).unwrap()
  }

  async function updateProduct(id: string, input: ProductInput) {
    await dispatch(updateProductThunk({ id, input })).unwrap()
  }

  async function deleteProduct(id: string) {
    await dispatch(deleteProductThunk(id)).unwrap()
  }

  return {
    products,
    isLoading: status === "loading" || status === "idle",
    isError: status === "failed",
    error,
    addProduct,
    updateProduct,
    deleteProduct,
  }
}
