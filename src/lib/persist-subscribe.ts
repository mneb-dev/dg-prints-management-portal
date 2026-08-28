import type { Store } from "@reduxjs/toolkit"

import { AUTH_STORAGE_KEY, type AuthState } from "@/lib/auth-slice"
import { ORDERS_STORAGE_KEY, type OrdersState } from "@/lib/orders-slice"
import { THEME_STORAGE_KEY, type ThemeState } from "@/lib/theme-slice"

type PersistedState = {
  auth: AuthState
  theme: ThemeState
  orders: OrdersState
}

function writeAuth(auth: AuthState) {
  if (auth.isAuthenticated) {
    localStorage.setItem(AUTH_STORAGE_KEY, "mock-token")
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

function writeTheme(theme: ThemeState) {
  localStorage.setItem(THEME_STORAGE_KEY, theme.theme)
}

function writeOrders(orders: OrdersState) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders.items))
}

export function subscribeToLocalStorage(store: Store<PersistedState>) {
  let prev = store.getState()

  store.subscribe(() => {
    const state = store.getState()
    if (state.auth !== prev.auth) writeAuth(state.auth)
    if (state.theme !== prev.theme) writeTheme(state.theme)
    if (state.orders !== prev.orders) writeOrders(state.orders)
    prev = state
  })
}
