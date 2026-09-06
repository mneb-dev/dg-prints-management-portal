import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

import { useAuth } from "@/lib/auth"
import type { PermissionKey, Role } from "@/lib/users-slice"

export function ProtectedRoute({
  children,
  roles,
  permission,
  bypassPermissionRoles,
}: {
  children: ReactNode
  roles?: Role[]
  permission?: PermissionKey
  /** Roles that skip the `permission` check entirely — e.g. superadmin always
   * getting in regardless of their permission list, while admin needs the
   * permission explicitly granted. */
  bypassPermissionRoles?: Role[]
}) {
  const { isAuthenticated, role, hasPermission } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/dashboard" replace />
  }
  if (permission && !hasPermission(permission) && !(role && bypassPermissionRoles?.includes(role))) {
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
