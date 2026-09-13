import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { RootState } from "@/lib/store"

export const ROLES = ["staff", "admin", "superadmin"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Super Admin",
}

export const PERMISSION_KEYS = [
  "manage_products",
  "manage_orders",
  "manage_users",
  "manage_expenses",
  "manage_settings",
  "manage_incentives",
] as const
export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manage_products: "Manage Products",
  manage_orders: "Manage Orders",
  manage_users: "Manage Users",
  manage_expenses: "Manage Expenses",
  manage_settings: "Manage App Settings",
  manage_incentives: "Manage Incentives",
}

export const USER_STATUSES = ["active", "inactive"] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export type User = {
  id: string
  firstName: string
  lastName: string
  username: string
  role: Role
  permissions: PermissionKey[]
  avatar: string | null
  status: UserStatus
  commissionRate: number
  dailyRate: number | null
  createdAt: string
  updatedAt: string
}

export type UserInput = {
  firstName: string
  lastName: string
  username: string
  role: Role
  permissions: PermissionKey[]
  status: UserStatus
  commissionRate: number
  dailyRate: number | null
}

/** An admin cannot edit, delete, or reset the password of a superadmin account. */
export function canManageUser(actorRole: Role, target: User): boolean {
  return !(actorRole === "admin" && target.role === "superadmin")
}

export type UsersQueryParams = {
  page: number
  pageSize: number
  search: string
  role: string
  status: string
  sortBy: string
  sortDir: "asc" | "desc"
}

export type UsersListResponse = {
  items: User[]
  total: number
  page: number
  pageSize: number | null
}

// Lean, non-admin-gated projection for pickers (e.g. the order "Layout by" field) —
// no role/permissions/username, so any authenticated role can fetch it.
export type UserOption = {
  id: string
  firstName: string
  lastName: string
  status: UserStatus
}

export const fetchUsersThunk = createAsyncThunk<
  UsersListResponse,
  UsersQueryParams,
  { rejectValue: string; state: RootState }
>("users/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<UsersListResponse>("/users", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search || undefined,
        role: params.role || undefined,
        status: params.status || undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      },
    })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

/** Serializes fetchUserOptionsThunk's args into a stable key so `condition`, optionsCache, and
 * the in-flight tracker can tell two identical-args requests apart from two genuinely different
 * ones (e.g. one caller wanting `{role: "staff"}` and another wanting everyone). */
export function userOptionsRequestKey(arg: { includeInactive?: boolean; role?: Role } | undefined): string {
  return JSON.stringify({ includeInactive: !!arg?.includeInactive, role: arg?.role ?? null })
}

/** Not gated behind manage_users — any authenticated role can fetch user options for pickers
 *  (e.g. the order "Layout by" field, or the dashboard sales-by-creator filter). Defaults to
 *  active users only; pass `{ includeInactive: true }` to list everyone. Pass `{ role: "staff" }`
 *  to further restrict the roster to one role (e.g. a staff viewer's sales filter should never see
 *  admin/superadmin as pickable names). See users.tsx#useUserOptions.
 *
 *  `condition` dedupes concurrent requests sharing the same args (checked synchronously against
 *  live state at dispatch time) -- useUserOptions() has no Redux-level caching of its own (it
 *  keeps results in local component state so different callers can pass different args), so
 *  without this, several components mounting with the same args each fired their own identical
 *  request to /users/options. */
export const fetchUserOptionsThunk = createAsyncThunk<
  UserOption[],
  { includeInactive?: boolean; role?: Role } | undefined,
  { rejectValue: string; state: RootState }
>(
  "users/fetchOptions",
  async (arg, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.get<UserOption[]>("/users/options", {
        params: {
          ...(arg?.includeInactive ? { includeInactive: true } : undefined),
          ...(arg?.role ? { role: arg.role } : undefined),
        },
      })
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  },
  {
    condition: (arg, { getState }) => {
      const key = userOptionsRequestKey(arg)
      const state = getState().users
      return !(key in state.optionsCache) && !state.optionsInFlightKeys.includes(key)
    },
  }
)

export const createUserThunk = createAsyncThunk<User, UserInput, { rejectValue: string }>(
  "users/create",
  async (input, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<User>("/users", input)
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const updateUserThunk = createAsyncThunk<
  User,
  { id: string; input: UserInput },
  { rejectValue: string }
>("users/update", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<User>(`/users/${id}`, input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const resetUserPasswordThunk = createAsyncThunk<
  { password: string },
  string,
  { rejectValue: string }
>("users/resetPassword", async (id, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<{ password: string }>(`/users/${id}/reset-password`)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteUserThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "users/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/users/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

type UsersState = {
  items: User[]
  total: number
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
  latestRequestId: string | null
  params: UsersQueryParams
  // Cached fetchUserOptionsThunk results, keyed by userOptionsRequestKey(args) -- fetched once
  // per session per distinct (includeInactive, role) combination, same "fetch once and share via
  // Redux" convention as every other reference-data hook in this codebase (categories,
  // order-statuses, order-channels, ...). useUserOptions() used to keep its result in local
  // component state instead, so without this, several components mounting with the same args
  // each fired their own identical request to /users/options.
  optionsCache: Record<string, UserOption[]>
  // Keys currently being fetched — lets `condition` also skip a second concurrent request for a
  // key that hasn't resolved into optionsCache yet.
  optionsInFlightKeys: string[]
}

const initialState: UsersState = {
  items: [],
  total: 0,
  status: "idle",
  error: null,
  latestRequestId: null,
  optionsCache: {},
  optionsInFlightKeys: [],
  params: {
    page: 1,
    pageSize: 10,
    search: "",
    role: "",
    status: "",
    sortBy: "created_at",
    sortDir: "asc",
  },
}

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUsersParams(state, action: PayloadAction<Partial<UsersQueryParams>>) {
      state.params = { ...state.params, ...action.payload }
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchUsersThunk.pending, (state, action) => {
        state.status = "loading"
        state.error = null
        state.latestRequestId = action.meta.requestId
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "succeeded"
        state.items = action.payload.items
        state.total = action.payload.total
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "failed"
        state.error = action.payload ?? "Failed to load users."
      })
      .addCase(fetchUserOptionsThunk.pending, (state, action) => {
        state.optionsInFlightKeys.push(userOptionsRequestKey(action.meta.arg))
      })
      .addCase(fetchUserOptionsThunk.fulfilled, (state, action) => {
        const key = userOptionsRequestKey(action.meta.arg)
        state.optionsInFlightKeys = state.optionsInFlightKeys.filter((k) => k !== key)
        state.optionsCache[key] = action.payload
      })
      .addCase(fetchUserOptionsThunk.rejected, (state, action) => {
        const key = userOptionsRequestKey(action.meta.arg)
        state.optionsInFlightKeys = state.optionsInFlightKeys.filter((k) => k !== key)
      })
  },
})

export const { setUsersParams } = usersSlice.actions
export default usersSlice.reducer
export type { UsersState }
