import type { Store } from "@reduxjs/toolkit"

import { AUTH_STORAGE_KEY, type AuthState } from "@/lib/auth-slice"
import { PRODUCTS_STORAGE_KEY, type ProductsState } from "@/lib/products-slice"
import { THEME_STORAGE_KEY, type ThemeState } from "@/lib/theme-slice"

type PersistedState = {
  auth: AuthState
  theme: ThemeState
  products: ProductsState
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

function writeProducts(products: ProductsState) {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products.items))
}

export function subscribeToLocalStorage(store: Store<PersistedState>) {
  let prev = store.getState()

  store.subscribe(() => {
    const state = store.getState()
    if (state.auth !== prev.auth) writeAuth(state.auth)
    if (state.theme !== prev.theme) writeTheme(state.theme)
    if (state.products !== prev.products) writeProducts(state.products)
    prev = state
  })
}
