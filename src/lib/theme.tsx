import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { getSystemTheme, systemThemeChanged, themeSet, type Theme } from "@/lib/theme-slice"

export function useTheme() {
  const theme = useAppSelector((state) => state.theme.theme)
  const resolvedTheme = useAppSelector((state) => state.theme.resolvedTheme)
  const dispatch = useAppDispatch()

  function setTheme(next: Theme) {
    dispatch(themeSet(next))
  }

  return { theme, resolvedTheme, setTheme }
}

/**
 * Keeps the `dark` class on <html> and `resolvedTheme` in sync with the OS
 * preference for as long as the app is mounted. Must be rendered once at the
 * app root — `useTheme()` itself is only called from the theme toggle button,
 * which isn't always mounted, so these effects can't live there.
 */
export function ThemeSync() {
  const theme = useAppSelector((state) => state.theme.theme)
  const resolvedTheme = useAppSelector((state) => state.theme.resolvedTheme)
  const dispatch = useAppDispatch()

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  }, [resolvedTheme])

  useEffect(() => {
    if (theme !== "system") return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    function handleChange() {
      dispatch(systemThemeChanged(getSystemTheme()))
    }

    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [theme, dispatch])

  return null
}
