import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createPaymentMethodThunk,
  deletePaymentMethodThunk,
  fetchPaymentMethodsThunk,
  reorderPaymentMethodsThunk,
  updatePaymentMethodThunk,
} from "@/lib/payment-methods-slice"

export type { PaymentMethodItem } from "@/lib/payment-methods-slice"

/** Full payment method list (enabled and disabled), fetched once per session — for the Settings page. */
export function usePaymentMethods() {
  const items = useAppSelector((state) => state.paymentMethods.items)
  const status = useAppSelector((state) => state.paymentMethods.status)
  const error = useAppSelector((state) => state.paymentMethods.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (status === "idle") dispatch(fetchPaymentMethodsThunk())
  }, [dispatch, status])

  return {
    paymentMethods: items,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
  }
}

/** Enabled method names only, in display order — for the order form's pickers. */
export function useEnabledPaymentMethods() {
  const { paymentMethods, isLoading } = usePaymentMethods()
  return { paymentMethods: paymentMethods.filter((method) => method.enabled).map((method) => method.name), isLoading }
}

/** Payment method create/rename/toggle/delete/reorder — for the Settings page. */
export function usePaymentMethodActions() {
  const dispatch = useAppDispatch()

  async function addPaymentMethod(name: string) {
    await dispatch(createPaymentMethodThunk(name)).unwrap()
  }

  async function renamePaymentMethod(id: string, name: string) {
    await dispatch(updatePaymentMethodThunk({ id, input: { name } })).unwrap()
  }

  async function togglePaymentMethod(id: string, enabled: boolean) {
    await dispatch(updatePaymentMethodThunk({ id, input: { enabled } })).unwrap()
  }

  async function deletePaymentMethod(id: string) {
    await dispatch(deletePaymentMethodThunk(id)).unwrap()
  }

  async function reorderPaymentMethods(order: string[]) {
    await dispatch(reorderPaymentMethodsThunk(order)).unwrap()
  }

  return {
    addPaymentMethod,
    renamePaymentMethod,
    togglePaymentMethod,
    deletePaymentMethod,
    reorderPaymentMethods,
  }
}
