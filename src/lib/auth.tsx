import {
  changePasswordThunk,
  fetchCurrentUserThunk,
  loggedOut,
  loginThunk,
  updateProfileThunk,
} from "@/lib/auth-slice"
import type { ProfileInput } from "@/lib/auth-slice"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import type { PermissionKey } from "@/lib/users-slice"

export type { CurrentUser, ProfileInput } from "@/lib/auth-slice"

export function useAuth() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()

  async function login(username: string, password: string): Promise<string | null> {
    try {
      await dispatch(loginThunk({ username, password })).unwrap()
      return null
    } catch (err) {
      return typeof err === "string" ? err : "Failed to sign in."
    }
  }

  function logout() {
    dispatch(loggedOut())
  }

  async function refreshCurrentUser() {
    await dispatch(fetchCurrentUserThunk())
  }

  function hasPermission(key: PermissionKey): boolean {
    return user?.permissions.includes(key) ?? false
  }

  async function updateProfile(input: ProfileInput): Promise<string | null> {
    try {
      await dispatch(updateProfileThunk(input)).unwrap()
      return null
    } catch (err) {
      return typeof err === "string" ? err : "Failed to update profile."
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<string | null> {
    try {
      await dispatch(changePasswordThunk({ currentPassword, newPassword })).unwrap()
      return null
    } catch (err) {
      return typeof err === "string" ? err : "Failed to change password."
    }
  }

  return {
    isAuthenticated,
    user,
    role: user?.role ?? null,
    permissions: user?.permissions ?? [],
    hasPermission,
    login,
    logout,
    refreshCurrentUser,
    updateProfile,
    changePassword,
  }
}
