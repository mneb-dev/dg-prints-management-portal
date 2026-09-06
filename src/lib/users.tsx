import { useEffect, useState } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createUserThunk,
  deleteUserThunk,
  fetchUserOptionsThunk,
  fetchUsersThunk,
  resetUserPasswordThunk,
  setUsersParams,
  updateUserThunk,
} from "@/lib/users-slice"
import type { Role, UserInput, UserOption, UsersQueryParams } from "@/lib/users-slice"

export {
  canManageUser,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  ROLES,
  USER_STATUSES,
} from "@/lib/users-slice"
export type {
  PermissionKey,
  Role,
  User,
  UserInput,
  UserOption,
  UsersQueryParams,
  UserStatus,
} from "@/lib/users-slice"

/** Paginated Users list — for the Users list page. Refetches whenever `params` changes. */
export function useUsers() {
  const users = useAppSelector((state) => state.users.items)
  const total = useAppSelector((state) => state.users.total)
  const params = useAppSelector((state) => state.users.params)
  const status = useAppSelector((state) => state.users.status)
  const error = useAppSelector((state) => state.users.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchUsersThunk(params))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    params.page,
    params.pageSize,
    params.search,
    params.role,
    params.status,
    params.sortBy,
    params.sortDir,
  ])

  function setParams(patch: Partial<UsersQueryParams>) {
    dispatch(setUsersParams(patch))
  }

  function refetch() {
    dispatch(fetchUsersThunk(params))
  }

  return {
    users,
    total,
    params,
    setParams,
    refetch,
    isLoading: status === "idle" || (status === "loading" && users.length === 0),
    isFetching: status === "loading" && users.length > 0,
    isError: status === "failed",
    error,
  }
}

/**
 * User list for pickers (e.g. the order "Layout by"/"Created by"/"Status updated by" fields, or
 * the dashboard sales-by-creator filter) — hits the non-admin-gated /users/options endpoint
 * (unlike useUsers above), so it works for any authenticated role, and is independent of the
 * Users list page's paginated `params` state, so it won't clobber that page's pagination when
 * both are used in the same session. Defaults to active users only; pass `includeInactive: true`
 * to list everyone regardless of status (e.g. so a sales filter can still isolate a former
 * staff member's past orders). Pass `role: "staff"` to restrict the picker to staff-role users
 * only (e.g. so a staff viewer's sales filter never sees admin/superadmin as pickable names).
 */
export function useUserOptions(enabled = true, includeInactive = false, role?: Role) {
  const dispatch = useAppDispatch()
  const [users, setUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setIsLoading(true)
    dispatch(fetchUserOptionsThunk({ includeInactive, role }))
      .unwrap()
      .then((result) => {
        if (!cancelled) setUsers(result)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dispatch, enabled, includeInactive, role])

  return { users, isLoading }
}

/** User create/update/delete only — no list fetch. For dialogs and the Users page's delete action. */
export function useUserActions() {
  const dispatch = useAppDispatch()

  async function addUser(input: UserInput) {
    await dispatch(createUserThunk(input)).unwrap()
  }

  async function updateUser(id: string, input: UserInput) {
    await dispatch(updateUserThunk({ id, input })).unwrap()
  }

  async function deleteUser(id: string) {
    await dispatch(deleteUserThunk(id)).unwrap()
  }

  async function resetUserPassword(id: string) {
    const { password } = await dispatch(resetUserPasswordThunk(id)).unwrap()
    return password
  }

  return { addUser, updateUser, deleteUser, resetUserPassword }
}
