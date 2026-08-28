import { configureStore } from "@reduxjs/toolkit"

import authReducer from "@/lib/auth-slice"
import { subscribeToLocalStorage } from "@/lib/persist-subscribe"
import productsReducer from "@/lib/products-slice"
import themeReducer from "@/lib/theme-slice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    products: productsReducer,
  },
})

subscribeToLocalStorage(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
