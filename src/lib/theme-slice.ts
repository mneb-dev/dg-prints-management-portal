import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

const THEME_STORAGE_KEY = "dgprints_theme"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

type ThemeState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system"
}

const initialState: ThemeState = {
  theme: getInitialTheme(),
  resolvedTheme: document.documentElement.classList.contains("dark") ? "dark" : "light",
}

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    themeSet(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
      state.resolvedTheme = action.payload === "system" ? getSystemTheme() : action.payload
    },
    systemThemeChanged(state, action: PayloadAction<ResolvedTheme>) {
      state.resolvedTheme = action.payload
    },
  },
})

export const { themeSet, systemThemeChanged } = themeSlice.actions
export default themeSlice.reducer
export { THEME_STORAGE_KEY }
export type { ThemeState }
