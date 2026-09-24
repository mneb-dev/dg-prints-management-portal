import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

const THEME_STORAGE_KEY = "dgprints_theme"

/** The theme actually applied to the page. */
export type Theme = "light" | "dark"

/** What the user picked — "system" follows the OS `prefers-color-scheme`. */
export type ThemePreference = Theme | "system"

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"]

type ThemeState = {
  theme: ThemePreference
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function resolveTheme(preference: ThemePreference): Theme {
  return preference === "system" ? getSystemTheme() : preference
}

// Mirrors the pre-paint script in index.html, which reads the same key before React mounts so
// there's no flash of the wrong theme.
function getInitialTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (THEME_PREFERENCES.includes(stored as ThemePreference)) return stored as ThemePreference
  } catch {
    // Storage blocked (private mode etc.) — fall through to following the OS.
  }
  return "system"
}

const initialState: ThemeState = {
  theme: getInitialTheme(),
}

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    themeSet(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload
    },
  },
})

export const { themeSet } = themeSlice.actions
export default themeSlice.reducer
export { THEME_STORAGE_KEY }
export type { ThemeState }
