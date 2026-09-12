import { useEffect } from "react"

import {
  fetchCommissionOrdersThunk,
  fetchCommissionSummaryThunk,
  fetchMonthlyIncentiveHistoryThunk,
  fetchMonthlyIncentiveSummaryThunk,
  fetchPreviousMonthlyIncentiveSummaryThunk,
  releaseCommissionOrdersThunk,
  releaseMonthlyIncentiveThunk,
  STAFF_COMMISSION_PRESETS,
  unreleaseCommissionOrdersThunk,
  unreleaseMonthlyIncentiveThunk,
} from "@/lib/commission-slice"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"

export type {
  CommissionOrderRow,
  CommissionSummaryRow,
  MonthlyIncentiveHistoryEntry,
  MonthlyIncentiveOwnShare,
  MonthlyIncentiveStaffShare,
  MonthlyIncentiveSummary,
  MonthlyIncentiveTier,
} from "@/lib/commission-slice"
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

/** Team-wide monthly incentive tier pool (9-tier ladder + split) for an explicit [dateFrom,
 * dateTo] window the caller computes -- the Incentives page always passes "this calendar month",
 * independent of its own top filter bar. The server hides `perStaff` for staff-role callers;
 * `tiers`/`totalStaffSales`/`pool` are visible to everyone. */
export function useMonthlyIncentiveSummary(dateFrom: string, dateTo: string) {
  const data = useAppSelector((state) => state.commission.monthlyIncentive)
  const status = useAppSelector((state) => state.commission.monthlyIncentiveStatus)
  const error = useAppSelector((state) => state.commission.monthlyIncentiveError)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    dispatch(fetchMonthlyIncentiveSummaryThunk({ dateFrom, dateTo }))
  }, [dispatch, dateFrom, dateTo])

  return {
    data,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
    refetch: () => {
      if (!dateFrom || !dateTo) return
      dispatch(fetchMonthlyIncentiveSummaryThunk({ dateFrom, dateTo }))
    },
  }
}

/** Same shape as useMonthlyIncentiveSummary but backed by its own state slot, so a previous-month
 * lookup (for the staff month-over-month comparison) doesn't clobber the current-month data the
 * tier ladder/pool cards are showing. */
export function usePreviousMonthlyIncentiveSummary(dateFrom: string, dateTo: string) {
  const data = useAppSelector((state) => state.commission.monthlyIncentivePrevious)
  const status = useAppSelector((state) => state.commission.monthlyIncentivePreviousStatus)
  const error = useAppSelector((state) => state.commission.monthlyIncentivePreviousError)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    dispatch(fetchPreviousMonthlyIncentiveSummaryThunk({ dateFrom, dateTo }))
  }, [dispatch, dateFrom, dateTo])

  return {
    data,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
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

/** Admin/superadmin-only mutations for releasing/undoing the monthly incentive pool for a given
 * [dateFrom, dateTo] window (the calendar month containing dateFrom). The server always refuses
 * the current month regardless of what's passed. */
export function useMonthlyIncentiveReleaseActions() {
  const dispatch = useAppDispatch()
  return {
    release: (dateFrom: string, dateTo: string) =>
      dispatch(releaseMonthlyIncentiveThunk({ dateFrom, dateTo })).unwrap(),
    unrelease: (dateFrom: string, dateTo: string) =>
      dispatch(unreleaseMonthlyIncentiveThunk({ dateFrom, dateTo })).unwrap(),
  }
}

/** Admin/superadmin-only: one row per calendar month of `year` (Jan through the current month if
 * `year` is this year, otherwise all 12), for the incentive release history table. Refetches
 * whenever `year` changes. */
export function useMonthlyIncentiveHistory(year: number) {
  const rows = useAppSelector((state) => state.commission.incentiveHistory)
  const status = useAppSelector((state) => state.commission.incentiveHistoryStatus)
  const error = useAppSelector((state) => state.commission.incentiveHistoryError)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchMonthlyIncentiveHistoryThunk({ year }))
  }, [dispatch, year])

  return {
    rows,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
    refetch: () => {
      dispatch(fetchMonthlyIncentiveHistoryThunk({ year }))
    },
  }
}
