import type { ReactNode } from "react"
import { createContext, useContext, useState } from "react"

const AUTH_STORAGE_KEY = "dgprints_auth"

type AuthContextValue = {
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_STORAGE_KEY) !== null
  )

  function login(username: string, password: string) {
    if (!username.trim() || !password.trim()) {
      return false
    }
    localStorage.setItem(AUTH_STORAGE_KEY, "mock-token")
    setIsAuthenticated(true)
    return true
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
