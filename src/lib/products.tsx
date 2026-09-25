import { useEffect, useState } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { isNewProduct, NEW_PRODUCT_DAYS } from "@/lib/new-products"
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
  KNOWN_PRODUCT_CATEGORIES,
  PRICING_TYPES,
  PRICING_UNITS,
  PRODUCT_STATUSES,
  summarizePricing,
} from "@/lib/products-slice"
export type {
  AppliesTo,
  AppliesToCondition,
  PricingEntry,
  PricingType,
  PricingUnit,
  Product,
  ProductCategory,
  ProductImage,
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
    params.showInShop,
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

/** Active products added in the last NEW_PRODUCT_DAYS days (see new-products.ts) — drives the
 * Products sidebar badge count and the table's "New" chip. */
export function useNewProducts() {
  const { products } = useProductCatalog()
  // Captured once per mount: "new" is measured in days, so a fixed now is precise enough and keeps
  // render pure.
  const [now] = useState(() => Date.now())
  const newProducts = products.filter((product) => isNewProduct(product, now))
  return { newProducts, newProductCount: newProducts.length, newProductDays: NEW_PRODUCT_DAYS }
}

/** Product create/update/delete only — no list fetch. For dialogs and the Products page's delete action. */
export function useProductActions() {
  const dispatch = useAppDispatch()

  async function addProduct(input: ProductInput) {
    return await dispatch(createProductThunk(input)).unwrap()
  }

  async function updateProduct(id: string, input: Partial<ProductInput>) {
    await dispatch(updateProductThunk({ id, input })).unwrap()
  }

  async function deleteProduct(id: string) {
    await dispatch(deleteProductThunk(id)).unwrap()
  }

  return { addProduct, updateProduct, deleteProduct }
}
