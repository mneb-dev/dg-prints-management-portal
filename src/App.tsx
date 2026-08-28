import { Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/layouts/app-layout"
import { ProtectedRoute, PublicOnlyRoute } from "@/lib/route-guards"
import { CreateOrderPage } from "@/pages/create-order-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { EditOrderPage } from "@/pages/edit-order-page"
import { LoginPage } from "@/pages/login-page"
import { OrderDetailsPage } from "@/pages/order-details-page"
import { OrdersPage } from "@/pages/orders-page"
import { ProductsPage } from "@/pages/products-page"
import { UsersPage } from "@/pages/users-page"

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<CreateOrderPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/orders/:id/edit" element={<EditOrderPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
