import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createProductThunk,
  deleteProductThunk,
  fetchAllProductsThunk,
  fetchProductsThunk,
  setProductsParams,
  updateProductThunk,
} from "@/lib/products-slice"
import type { ProductInput, ProductsQueryParams } from "@/lib/products-slice"

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
  ProductsQueryParams,
  ProductStatus,
} from "@/lib/products-slice"

/** Paginated Products list — for the Products list page only. Refetches whenever `params` changes. */
export function useProducts() {
  const products = useAppSelector((state) => state.products.items)
  const total = useAppSelector((state) => state.products.total)
  const params = useAppSelector((state) => state.products.params)
  const status = useAppSelector((state) => state.products.status)
  const error = useAppSelector((state) => state.products.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchProductsThunk(params))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    params.page,
    params.pageSize,
    params.search,
    params.category,
    params.status,
    params.pricingType,
    params.sortBy,
    params.sortDir,
  ])

  function setParams(patch: Partial<ProductsQueryParams>) {
    dispatch(setProductsParams(patch))
  }

  function refetch() {
    dispatch(fetchProductsThunk(params))
  }

  return {
    products,
    total,
    params,
    setParams,
    refetch,
    isLoading: status === "idle" || (status === "loading" && products.length === 0),
    isFetching: status === "loading" && products.length > 0,
    isError: status === "failed",
    error,
  }
}

/** Full unpaginated product catalog, fetched once per session — for the order-form product picker. */
export function useProductCatalog() {
  const products = useAppSelector((state) => state.products.catalog)
  const status = useAppSelector((state) => state.products.catalogStatus)
  const error = useAppSelector((state) => state.products.catalogError)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchAllProductsThunk())
  }, [dispatch])

  return {
    products,
    isLoading: status === "loading" || status === "idle",
    isError: status === "failed",
    error,
  }
}

/** Product create/update/delete only — no list fetch. For dialogs and the Products page's delete action. */
export function useProductActions() {
  const dispatch = useAppDispatch()

  async function addProduct(input: ProductInput) {
    await dispatch(createProductThunk(input)).unwrap()
  }

  async function updateProduct(id: string, input: ProductInput) {
    await dispatch(updateProductThunk({ id, input })).unwrap()
  }

  async function deleteProduct(id: string) {
    await dispatch(deleteProductThunk(id)).unwrap()
  }

  return { addProduct, updateProduct, deleteProduct }
}
