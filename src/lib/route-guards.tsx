import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/lib/auth"
import type { PermissionKey, Role } from "@/lib/users-slice"

export function ProtectedRoute({
  children,
  roles,
  permission,
}: {
  children: ReactNode
  roles?: Role[]
  permission?: PermissionKey
}) {
  const { isAuthenticated, role, hasPermission } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/dashboard" replace />
  }
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
