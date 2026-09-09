import { useEffect } from "react"
import type { LucideIcon } from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { getOrderStatusColors } from "@/lib/order-status-colors"
import { getOrderStatusIcon } from "@/lib/order-status-icons"
import {
  createOrderStatusThunk,
  deleteOrderStatusThunk,
  fetchOrderStatusesThunk,
  reorderOrderStatusesThunk,
  updateOrderStatusThunk,
} from "@/lib/order-statuses-slice"
import type { OrderStatusInput } from "@/lib/order-statuses-slice"

export type { OrderStatusItem, OrderStatusInput } from "@/lib/order-statuses-slice"
export type { OrderStatusColors } from "@/lib/order-status-colors"

/** Full order-status list (enabled and disabled), fetched once per session. */
export function useOrderStatuses() {
  const statuses = useAppSelector((state) => state.orderStatuses.items)
  const status = useAppSelector((state) => state.orderStatuses.status)
  const error = useAppSelector((state) => state.orderStatuses.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (status === "idle") dispatch(fetchOrderStatusesThunk())
  }, [dispatch, status])

  return {
    statuses,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
  }
}

/** Only enabled statuses, ordered by sortOrder — for badges, menus, dashboard tiles, and
 * the category status-flow picker. */
export function useActiveOrderStatuses() {
  const { statuses, isLoading, isError, error } = useOrderStatuses()
  const active = statuses.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
  return { statuses: active, isLoading, isError, error }
}

/** Label/icon/color lookups by status name, closed over the fetched list, with a graceful
 * fallback for an unrecognized or legacy status string. Lets every call site that used to
 * index the old static ORDER_STATUS_LABELS/ICONS/COLORS objects become a mechanical
 * getLabel(x)/getIcon(x)/getColors(x) swap. */
export function useOrderStatusLookup() {
  const { statuses } = useOrderStatuses()

  function find(name: string) {
    return statuses.find((s) => s.name === name)
  }

  function getLabel(name: string): string {
    return find(name)?.label ?? name
  }

  function getIcon(name: string): LucideIcon {
    return getOrderStatusIcon(find(name)?.icon ?? "circle")
  }

  function getColors(name: string) {
    return getOrderStatusColors(find(name)?.color ?? "slot-1")
  }

  return { getLabel, getIcon, getColors }
}

/** Order-status create/rename/re-icon/toggle/delete/reorder — no list fetch. For the
 * Order Statuses tab in Manage Categories. */
export function useOrderStatusActions() {
  const dispatch = useAppDispatch()

  async function addStatus(input: OrderStatusInput) {
    await dispatch(createOrderStatusThunk(input)).unwrap()
  }

  async function updateStatus(
    id: string,
    input: { name?: string; label?: string; icon?: string; color?: string; enabled?: boolean }
  ) {
    await dispatch(updateOrderStatusThunk({ id, input })).unwrap()
  }

  async function deleteStatus(id: string) {
    await dispatch(deleteOrderStatusThunk(id)).unwrap()
  }

  async function reorderStatuses(order: string[]) {
    await dispatch(reorderOrderStatusesThunk(order)).unwrap()
  }

  return { addStatus, updateStatus, deleteStatus, reorderStatuses }
}
