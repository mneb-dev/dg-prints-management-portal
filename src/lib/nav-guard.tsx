import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react"

type NavGuardHandler = (targetPath: string) => void

type NavGuardContextValue = {
  setGuard: (handler: NavGuardHandler | null) => void
  requestNavigation: (targetPath: string) => boolean
}

const NavGuardContext = createContext<NavGuardContextValue | null>(null)

/** Lets a dirty form (OrderForm) intercept in-app navigation attempts (sidebar clicks) that would
 * otherwise discard unsaved work — the app uses a plain BrowserRouter, so there's no useBlocker. */
export function NavGuardProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<NavGuardHandler | null>(null)

  const setGuard = useCallback((handler: NavGuardHandler | null) => {
    handlerRef.current = handler
  }, [])

  const requestNavigation = useCallback((targetPath: string) => {
    if (handlerRef.current) {
      handlerRef.current(targetPath)
      return false
    }
    return true
  }, [])

  const value = useMemo(() => ({ setGuard, requestNavigation }), [setGuard, requestNavigation])

  return <NavGuardContext.Provider value={value}>{children}</NavGuardContext.Provider>
}

export function useNavGuard() {
  const ctx = useContext(NavGuardContext)
  if (!ctx) throw new Error("useNavGuard must be used within a NavGuardProvider")
  return ctx
}
