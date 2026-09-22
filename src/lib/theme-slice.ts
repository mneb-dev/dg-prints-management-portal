import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

const THEME_STORAGE_KEY = "dgprints_theme"

export type Theme = "light" | "dark"

type ThemeState = {
  theme: Theme
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

// Dark mode is disabled for now — always start in light mode regardless of what's
// persisted or the OS preference. `themeSet`/`toggleTheme` still work if something calls
// them, but the toggle UI is unmounted (see ThemeToggle usage in app-layout.tsx), so
// nothing currently does.
function getInitialTheme(): Theme {
  return "light"
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
