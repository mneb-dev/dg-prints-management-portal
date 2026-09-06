import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createCategoryThunk,
  deleteCategoryThunk,
  fetchCategoriesThunk,
  updateCategoryThunk,
} from "@/lib/categories-slice"
import type { CategoryInput } from "@/lib/categories-slice"

export type { Category, CategoryInput } from "@/lib/categories-slice"

/** Full category list (active and inactive), fetched once per session. */
export function useCategories() {
  const categories = useAppSelector((state) => state.categories.items)
  const status = useAppSelector((state) => state.categories.status)
  const error = useAppSelector((state) => state.categories.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (status === "idle") dispatch(fetchCategoriesThunk())
  }, [dispatch, status])

  return {
    categories,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
  }
}

/** Only active categories — for pickers where a new/edited product's category is assigned. */
export function useActiveCategories() {
  const { categories, isLoading, isError, error } = useCategories()
  return { categories: categories.filter((category) => category.active), isLoading, isError, error }
}

/** Category create/update/delete only — no list fetch. For the Categories page and its dialogs. */
export function useCategoryActions() {
  const dispatch = useAppDispatch()

  async function addCategory(input: CategoryInput) {
    await dispatch(createCategoryThunk(input)).unwrap()
  }

  async function updateCategory(id: string, input: CategoryInput) {
    await dispatch(updateCategoryThunk({ id, input })).unwrap()
  }

  async function deleteCategory(id: string) {
    await dispatch(deleteCategoryThunk(id)).unwrap()
  }

  return { addCategory, updateCategory, deleteCategory }
}
