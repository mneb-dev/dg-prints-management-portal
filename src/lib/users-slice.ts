import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { RootState } from "@/lib/store"

export const ROLES = ["staff", "admin", "superadmin"] as const
export type Role = (typeof ROLES)[number]

export const PERMISSION_KEYS = [
  "manage_products",
  "manage_orders",
  "manage_users",
  "view_reports",
] as const
export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manage_products: "Manage Products",
  manage_orders: "Manage Orders",
  manage_users: "Manage Users",
  view_reports: "View Reports",
}

export type User = {
  id: string
  firstName: string
  lastName: string
  username: string
  role: Role
  permissions: PermissionKey[]
  avatar: string | null
  createdAt: string
  updatedAt: string
}

export type UserInput = {
  firstName: string
  lastName: string
  username: string
  role: Role
  permissions: PermissionKey[]
  password?: string
}

function toUserPayload(input: UserInput) {
  const { password, ...rest } = input
  return password ? { ...rest, password } : rest
}

export type UsersQueryParams = {
  page: number
  pageSize: number
  search: string
  role: string
  sortBy: string
  sortDir: "asc" | "desc"
}

export type UsersListResponse = {
  items: User[]
  total: number
  page: number
  pageSize: number | null
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
        sortBy: params.sortBy,
        sortDir: params.sortDir,
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
      const { data } = await apiClient.post<User>("/users", toUserPayload(input))
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
    const { data } = await apiClient.put<User>(`/users/${id}`, toUserPayload(input))
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
