import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { productAdded, productDeleted, productUpdated } from "@/lib/products-slice"
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
  const dispatch = useAppDispatch()

  function addProduct(input: ProductInput) {
    dispatch(productAdded(input))
  }

  function updateProduct(id: string, input: ProductInput) {
    dispatch(productUpdated(id, input))
  }

  function deleteProduct(id: string) {
    dispatch(productDeleted(id))
  }

  return { products, addProduct, updateProduct, deleteProduct }
}
