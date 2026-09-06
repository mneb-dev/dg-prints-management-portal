import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { PermissionKey, Role, UserStatus } from "@/lib/users-slice"

const AUTH_STORAGE_KEY = "dgprints_auth"

export type CurrentUser = {
  id: string
  firstName: string
  lastName: string
  username: string
  role: Role
  permissions: PermissionKey[]
  avatar: string | null
  status: UserStatus
}

export type ProfileInput = Partial<{
  firstName: string
  lastName: string
  username: string
  avatar: string | null
}>

type AuthState = {
  isAuthenticated: boolean
  token: string | null
  user: CurrentUser | null
}

function readPersisted(): { token: string | null; user: CurrentUser | null } {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return { token: null, user: null }
  try {
    const parsed = JSON.parse(raw) as { token?: string; user?: CurrentUser }
    return { token: parsed.token ?? null, user: parsed.user ?? null }
  } catch {
    return { token: null, user: null }
  }
}

const persisted = readPersisted()

const initialState: AuthState = {
  isAuthenticated: persisted.token !== null,
  token: persisted.token,
  user: persisted.user,
}

export const loginThunk = createAsyncThunk<
  { token: string; user: CurrentUser },
  { username: string; password: string },
  { rejectValue: string }
>("auth/login", async ({ username, password }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<{ token: string; user: CurrentUser }>("/auth/login", {
      username,
      password,
    })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const fetchCurrentUserThunk = createAsyncThunk<
  { user: CurrentUser },
  void,
  { rejectValue: string }
>("auth/fetchCurrentUser", async (_arg, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<{ user: CurrentUser }>("/auth/me")
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const updateProfileThunk = createAsyncThunk<
  { user: CurrentUser },
  ProfileInput,
  { rejectValue: string }
>("auth/updateProfile", async (input, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.patch<{ user: CurrentUser }>("/auth/me", input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const changePasswordThunk = createAsyncThunk<
  void,
  { currentPassword: string; newPassword: string },
  { rejectValue: string }
>("auth/changePassword", async (input, { rejectWithValue }) => {
  try {
    await apiClient.post("/auth/change-password", input)
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loggedOut(state) {
      state.isAuthenticated = false
      state.token = null
      state.user = null
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isAuthenticated = true
        state.token = action.payload.token
        state.user = action.payload.user
      })
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        state.user = action.payload.user
      })
      .addCase(fetchCurrentUserThunk.rejected, (state) => {
        state.isAuthenticated = false
        state.token = null
        state.user = null
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload.user
      })
  },
})

export const { loggedOut } = authSlice.actions
export default authSlice.reducer
export { AUTH_STORAGE_KEY }
export type { AuthState }
