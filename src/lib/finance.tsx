import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { fetchFinanceSummaryThunk } from "@/lib/finance-slice"

export type { FinanceSeriesPoint, FinanceSummary } from "@/lib/finance-slice"

/** Finance report summary (revenue/expenses/profit + breakdowns) for an explicit
 * [dateFrom, dateTo] window (both inclusive, "yyyy-MM-dd"). Refetches whenever the range
 * changes. Pass "" for both to skip fetching (e.g. an incomplete custom range). */
export function useFinanceSummary(dateFrom: string, dateTo: string) {
  const summary = useAppSelector((state) => state.finance.summary)
  const status = useAppSelector((state) => state.finance.status)
  const error = useAppSelector((state) => state.finance.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    dispatch(fetchFinanceSummaryThunk({ dateFrom, dateTo }))
  }, [dispatch, dateFrom, dateTo])

  return {
    summary,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
  }
}
