import { useEffect } from "react"

import {
  fetchCommissionOrdersThunk,
  fetchCommissionSummaryThunk,
  releaseCommissionOrdersThunk,
  STAFF_COMMISSION_PRESETS,
  unreleaseCommissionOrdersThunk,
} from "@/lib/commission-slice"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"

export type { CommissionOrderRow, CommissionSummaryRow } from "@/lib/commission-slice"
export { STAFF_COMMISSION_PRESETS }

/** Per-staff commission breakdown (paid / unpaid+partial / total, plus released / pending-release
 * within paid) for an explicit [dateFrom, dateTo] window (both inclusive, "yyyy-MM-dd"),
 * optionally scoped to one staff member via `layoutBy`. The server forces staff callers to their
 * own id regardless of what's passed. Refetches whenever the range or layoutBy changes. Pass ""
 * for both dates to skip fetching (e.g. an incomplete custom range). */
export function useCommissionSummary(dateFrom: string, dateTo: string, layoutBy?: string) {
  const rows = useAppSelector((state) => state.commission.rows)
  const status = useAppSelector((state) => state.commission.status)
  const error = useAppSelector((state) => state.commission.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    dispatch(fetchCommissionSummaryThunk({ dateFrom, dateTo, layoutBy }))
  }, [dispatch, dateFrom, dateTo, layoutBy])

  return {
    rows,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
    refetch: () => {
      if (!dateFrom || !dateTo) return
      dispatch(fetchCommissionSummaryThunk({ dateFrom, dateTo, layoutBy }))
    },
  }
}

/** Individual commission-eligible orders (one row per order, not aggregated) for the same window
 * and scoping rules as useCommissionSummary — backs the release/unrelease order table. */
export function useCommissionOrders(dateFrom: string, dateTo: string, layoutBy?: string) {
  const rows = useAppSelector((state) => state.commission.orderRows)
  const status = useAppSelector((state) => state.commission.orderStatus)
  const error = useAppSelector((state) => state.commission.orderError)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    dispatch(fetchCommissionOrdersThunk({ dateFrom, dateTo, layoutBy }))
  }, [dispatch, dateFrom, dateTo, layoutBy])

  return {
    rows,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
    refetch: () => {
      if (!dateFrom || !dateTo) return
      dispatch(fetchCommissionOrdersThunk({ dateFrom, dateTo, layoutBy }))
    },
  }
}

/** Admin/superadmin-only mutations for marking commission-eligible orders released/unreleased.
 * Returns the ids the server actually affected (it silently skips ineligible ones), so callers
 * can detect a partial release. */
export function useCommissionReleaseActions() {
  const dispatch = useAppDispatch()
  return {
    release: (orderIds: string[]) => dispatch(releaseCommissionOrdersThunk(orderIds)).unwrap(),
    unrelease: (orderIds: string[]) => dispatch(unreleaseCommissionOrdersThunk(orderIds)).unwrap(),
  }
}
