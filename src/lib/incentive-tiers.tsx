import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createIncentiveTierThunk,
  deleteIncentiveTierThunk,
  fetchIncentiveTiersThunk,
  updateIncentiveTierThunk,
} from "@/lib/incentive-tiers-slice"

export type { IncentiveTier } from "@/lib/incentive-tiers-slice"

/** Full tier list, threshold-ascending, fetched once per session — for the App Settings page and
 * anywhere else that needs to browse/manage the ladder (the Sales-Target Bonus page gets its own
 * tiers, with progress/isMet already computed, from useMonthlyIncentiveSummary instead). */
export function useIncentiveTiers() {
  const items = useAppSelector((state) => state.incentiveTiers.items)
  const status = useAppSelector((state) => state.incentiveTiers.status)
  const error = useAppSelector((state) => state.incentiveTiers.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (status === "idle") dispatch(fetchIncentiveTiersThunk())
  }, [dispatch, status])

  return {
    tiers: items,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
  }
}

/** Tier create/edit/delete — for the App Settings page. Admin/superadmin only server-side. */
export function useIncentiveTierActions() {
  const dispatch = useAppDispatch()

  async function addIncentiveTier(threshold: number, amount: number) {
    await dispatch(createIncentiveTierThunk({ threshold, amount })).unwrap()
  }

  async function updateIncentiveTier(id: string, input: { threshold?: number; amount?: number }) {
    await dispatch(updateIncentiveTierThunk({ id, input })).unwrap()
  }

  async function deleteIncentiveTier(id: string) {
    await dispatch(deleteIncentiveTierThunk(id)).unwrap()
  }

  return { addIncentiveTier, updateIncentiveTier, deleteIncentiveTier }
}
