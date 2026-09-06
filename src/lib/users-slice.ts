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
] as const
export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manage_products: "Manage Products",
  manage_orders: "Manage Orders",
  manage_users: "Manage Users",
  manage_expenses: "Manage Expenses",
  manage_settings: "Manage App Settings",
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

/** Not gated behind manage_users — any authenticated role can fetch user options for pickers
 *  (e.g. the order "Layout by" field, or the dashboard sales-by-creator filter). Defaults to
 *  active users only; pass `{ includeInactive: true }` to list everyone. Pass `{ role: "staff" }`
 *  to further restrict the roster to one role (e.g. a staff viewer's sales filter should never see
 *  admin/superadmin as pickable names). See users.tsx#useUserOptions. */
export const fetchUserOptionsThunk = createAsyncThunk<
  UserOption[],
  { includeInactive?: boolean; role?: Role } | undefined,
  { rejectValue: string }
>("users/fetchOptions", async (arg, { rejectWithValue }) => {
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
})

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
}

const initialState: UsersState = {
  items: [],
  total: 0,
  status: "idle",
  error: null,
  latestRequestId: null,
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
  },
})

export const { setUsersParams } = usersSlice.actions
export default usersSlice.reducer
export type { UsersState }
