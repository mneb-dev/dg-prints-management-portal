import { createSlice } from "@reduxjs/toolkit"

const AUTH_STORAGE_KEY = "dgprints_auth"

type AuthState = {
  isAuthenticated: boolean
}

const initialState: AuthState = {
  isAuthenticated: localStorage.getItem(AUTH_STORAGE_KEY) !== null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSucceeded(state) {
      state.isAuthenticated = true
    },
    loggedOut(state) {
      state.isAuthenticated = false
    },
  },
})

export const { loginSucceeded, loggedOut } = authSlice.actions
export default authSlice.reducer
export { AUTH_STORAGE_KEY }
export type { AuthState }
