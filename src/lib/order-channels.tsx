import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createOrderChannelThunk,
  deleteOrderChannelThunk,
  fetchOrderChannelsThunk,
  reorderOrderChannelsThunk,
  updateOrderChannelThunk,
} from "@/lib/order-channels-slice"

export type { OrderChannelItem } from "@/lib/order-channels-slice"

/** Full order channel list (enabled and disabled), fetched once per session — for the Settings page. */
export function useOrderChannels() {
  const items = useAppSelector((state) => state.orderChannels.items)
  const status = useAppSelector((state) => state.orderChannels.status)
  const error = useAppSelector((state) => state.orderChannels.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (status === "idle") dispatch(fetchOrderChannelsThunk())
  }, [dispatch, status])

  return {
    orderChannels: items,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
  }
}

/** Enabled channel names only, in display order — for the order form's pickers. */
export function useEnabledOrderChannels() {
  const { orderChannels, isLoading } = useOrderChannels()
  return { orderChannels: orderChannels.filter((channel) => channel.enabled).map((channel) => channel.name), isLoading }
}

/** Order channel create/rename/toggle/delete/reorder — for the Settings page. */
export function useOrderChannelActions() {
  const dispatch = useAppDispatch()

  async function addOrderChannel(name: string) {
    await dispatch(createOrderChannelThunk(name)).unwrap()
  }

  async function renameOrderChannel(id: string, name: string) {
    await dispatch(updateOrderChannelThunk({ id, input: { name } })).unwrap()
  }

  async function toggleOrderChannel(id: string, enabled: boolean) {
    await dispatch(updateOrderChannelThunk({ id, input: { enabled } })).unwrap()
  }

  async function deleteOrderChannel(id: string) {
    await dispatch(deleteOrderChannelThunk(id)).unwrap()
  }

  async function reorderOrderChannels(order: string[]) {
    await dispatch(reorderOrderChannelsThunk(order)).unwrap()
  }

  return {
    addOrderChannel,
    renameOrderChannel,
    toggleOrderChannel,
    deleteOrderChannel,
    reorderOrderChannels,
  }
}
