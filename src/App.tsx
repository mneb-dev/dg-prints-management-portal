import { Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/layouts/app-layout"
import { ProtectedRoute, PublicOnlyRoute } from "@/lib/route-guards"
import { CalculatorPage } from "@/pages/calculator-page"
import { CreateOrderPage } from "@/pages/create-order-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { EditOrderPage } from "@/pages/edit-order-page"
import { ExpensesPage } from "@/pages/expenses-page"
import { LoginPage } from "@/pages/login-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { OrderDetailsPage } from "@/pages/order-details-page"
import { OrdersPage } from "@/pages/orders-page"
import { ProductsPage } from "@/pages/products-page"
import { ProfilePage } from "@/pages/profile-page"
import { RecurringExpensesPage } from "@/pages/recurring-expenses-page"
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
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute permission="manage_orders">
              <CreateOrderPage />
            </ProtectedRoute>
          }
        />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route
          path="/orders/:id/edit"
          element={
            <ProtectedRoute permission="manage_orders">
              <EditOrderPage />
            </ProtectedRoute>
          }
        />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route
          path="/expenses/recurring"
          element={
            <ProtectedRoute roles={["admin", "superadmin"]}>
              <RecurringExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={["admin", "superadmin"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App