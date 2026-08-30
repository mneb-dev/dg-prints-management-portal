import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createUserThunk,
  deleteUserThunk,
  fetchUsersThunk,
  setUsersParams,
  updateUserThunk,
} from "@/lib/users-slice"
import type { UserInput, UsersQueryParams } from "@/lib/users-slice"

export {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLES,
} from "@/lib/users-slice"
export type {
  PermissionKey,
  Role,
  User,
  UserInput,
  UsersQueryParams,
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
  }, [dispatch, params.page, params.pageSize, params.search, params.role, params.sortBy, params.sortDir])

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

  return { addUser, updateUser, deleteUser }
}
