import { loggedOut, loginSucceeded } from "@/lib/auth-slice"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"

export function useAuth() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const dispatch = useAppDispatch()

  function login(username: string, password: string) {
    if (!username.trim() || !password.trim()) {
      return false
    }
    dispatch(loginSucceeded())
    return true
  }

  function logout() {
    dispatch(loggedOut())
  }

  return { isAuthenticated, login, logout }
}
