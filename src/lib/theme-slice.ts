import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

const THEME_STORAGE_KEY = "dgprints_theme"

export type Theme = "light" | "dark"

type ThemeState = {
  theme: Theme
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === "light" || stored === "dark" ? stored : getSystemTheme()
}

const initialState: ThemeState = {
  theme: getInitialTheme(),
}

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    themeSet(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
    },
  },
})

export const { themeSet } = themeSlice.actions
export default themeSlice.reducer
export { THEME_STORAGE_KEY }
export type { ThemeState }
