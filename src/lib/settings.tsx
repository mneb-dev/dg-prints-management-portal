import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { fetchSettingsThunk, updateSettingsThunk } from "@/lib/settings-slice"
import type { AppSettings, AppSettingsInput } from "@/lib/settings-slice"

export type { AppSettings, AppSettingsInput } from "@/lib/settings-slice"

const FALLBACK_SETTINGS: AppSettings = {
  shippingFee: 0,
  updatedAt: "",
}

/** App-wide settings (currently just the default shipping fee), fetched once per session. */
export function useSettings() {
  const data = useAppSelector((state) => state.settings.data)
  const status = useAppSelector((state) => state.settings.status)
  const error = useAppSelector((state) => state.settings.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (status === "idle") dispatch(fetchSettingsThunk())
  }, [dispatch, status])

  return {
    settings: data ?? FALLBACK_SETTINGS,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
  }
}

/** Settings update only — no fetch. For the Settings page's shipping fee field. */
export function useSettingsActions() {
  const dispatch = useAppDispatch()

  async function updateSettings(input: AppSettingsInput): Promise<AppSettings> {
    return await dispatch(updateSettingsThunk(input)).unwrap()
  }

  return { updateSettings }
}
