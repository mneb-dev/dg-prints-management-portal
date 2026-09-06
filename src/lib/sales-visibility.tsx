import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { salesVisibilitySet } from "@/lib/sales-visibility-slice"

export function useSalesVisibility() {
  const isVisible = useAppSelector((state) => state.salesVisibility.isVisible)
  const dispatch = useAppDispatch()

  function toggleVisibility() {
    dispatch(salesVisibilitySet(!isVisible))
  }

  return { isVisible, toggleVisibility }
}
