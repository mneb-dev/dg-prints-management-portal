import { useEffect, useSyncExternalStore } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  THEME_PREFERENCES,
  getSystemTheme,
  themeSet,
  type Theme,
  type ThemePreference,
} from "@/lib/theme-slice"

export { THEME_PREFERENCES, type Theme, type ThemePreference }

const DARK_QUERY = "(prefers-color-scheme: dark)"

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

/** The OS theme, live — re-renders when the user flips their system setting. */
function useSystemTheme(): Theme {
  return useSyncExternalStore(subscribeToSystemTheme, getSystemTheme)
}

function useResolvedTheme(): { theme: ThemePreference; resolvedTheme: Theme } {
  const theme = useAppSelector((state) => state.theme.theme)
  const systemTheme = useSystemTheme()
  return { theme, resolvedTheme: theme === "system" ? systemTheme : theme }
}

export function useTheme() {
  const { theme, resolvedTheme } = useResolvedTheme()
  const dispatch = useAppDispatch()

  function setTheme(next: ThemePreference) {
    dispatch(themeSet(next))
  }

  /** Light → Dark → System → Light. */
  function cycleTheme() {
    const index = THEME_PREFERENCES.indexOf(theme)
    setTheme(THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length])
  }

  return { theme, resolvedTheme, setTheme, cycleTheme }
}

/**
 * Keeps the `dark` class on <html> in sync with the resolved theme (following the OS live when
 * the preference is "system") for as long as the app is mounted. Must be rendered once at the app
 * root — the toggle isn't mounted on every page, so this effect can't live there.
 */
export function ThemeSync() {
  const { resolvedTheme } = useResolvedTheme()

  useEffect(() => {
    const root = document.documentElement
    const isDark = resolvedTheme === "dark"
    if (root.classList.contains("dark") === isDark) return

    // Swap without every button/card easing its colors at once: kill transitions for the frame
    // the class flips, then restore them.
    root.setAttribute("data-theme-switching", "")
    root.classList.toggle("dark", isDark)
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => root.removeAttribute("data-theme-switching"))
    )
    return () => {
      cancelAnimationFrame(frame)
      root.removeAttribute("data-theme-switching")
    }
  }, [resolvedTheme])

  return null
}
