import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { themeSet, type Theme } from "@/lib/theme-slice"

export function useTheme() {
  const theme = useAppSelector((state) => state.theme.theme)
  const dispatch = useAppDispatch()

  function setTheme(next: Theme) {
    dispatch(themeSet(next))
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return { theme, setTheme, toggleTheme }
}

/**
 * Keeps the `dark` class on <html> in sync with `theme` for as long as the
 * app is mounted. Must be rendered once at the app root — `useTheme()` itself
 * is only called from the theme toggle, which isn't always mounted, so this
 * effect can't live there.
 */
export function ThemeSync() {
  const theme = useAppSelector((state) => state.theme.theme)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return null
}
