import { configureStore } from "@reduxjs/toolkit"

import authReducer from "@/lib/auth-slice"
import categoriesReducer from "@/lib/categories-slice"
import commissionReducer from "@/lib/commission-slice"
import expensesReducer from "@/lib/expenses-slice"
import financeReducer from "@/lib/finance-slice"
import incentiveTiersReducer from "@/lib/incentive-tiers-slice"
import orderChannelsReducer from "@/lib/order-channels-slice"
import orderStatusesReducer from "@/lib/order-statuses-slice"
import ordersReducer from "@/lib/orders-slice"
import paymentMethodsReducer from "@/lib/payment-methods-slice"
import { subscribeToLocalStorage } from "@/lib/persist-subscribe"
import productsReducer from "@/lib/products-slice"
import salesVisibilityReducer from "@/lib/sales-visibility-slice"
import settingsReducer from "@/lib/settings-slice"
import themeReducer from "@/lib/theme-slice"
import usersReducer from "@/lib/users-slice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    products: productsReducer,
    categories: categoriesReducer,
    orders: ordersReducer,
    users: usersReducer,
    expenses: expensesReducer,
    finance: financeReducer,
    commission: commissionReducer,
    settings: settingsReducer,
    incentiveTiers: incentiveTiersReducer,
    paymentMethods: paymentMethodsReducer,
    orderChannels: orderChannelsReducer,
    orderStatuses: orderStatusesReducer,
    salesVisibility: salesVisibilityReducer,
  },
})

subscribeToLocalStorage(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
