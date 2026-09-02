import { useEffect, useState } from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { ActiveFilterChips, FilterSearchInput, FilterToolbar, type ActiveFilter } from "@/components/filter-toolbar"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { SortControl } from "@/components/sort-control"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DeleteUserDialog } from "@/components/users/delete-user-dialog"
import { UserFormDialog } from "@/components/users/user-form-dialog"
import { UserTable } from "@/components/users/user-table"
import { useAuth } from "@/lib/auth"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { ROLES, USER_STATUSES, useUserActions, useUsers, type User } from "@/lib/users"

const ANY_ROLE = "All Roles"
const ANY_STATUS = "All Statuses"

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Super Admin",
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
}

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "name", label: "Name" },
  { value: "username", label: "Username" },
  { value: "role", label: "Role" },
]

export function UsersPage() {
  const { user: currentUser, role: currentUserRole } = useAuth()
  const { users, total, params, setParams, refetch, isLoading, isFetching, isError, error } = useUsers()
  const { deleteUser } = useUserActions()
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)

  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (debouncedSearch !== params.search) {
      setParams({ search: debouncedSearch, page: 1 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const hasActiveFilters =
    params.search !== "" ||
    params.role !== "" ||
    params.status !== "" ||
    params.sortBy !== "created_at" ||
    params.sortDir !== "asc"

  function clearFilters() {
    setSearchInput("")
    setParams({ search: "", role: "", status: "", sortBy: "created_at", sortDir: "asc", page: 1 })
  }

  const activeFilters: ActiveFilter[] = [
    params.search && {
      key: "search",
      label: `Search: "${params.search}"`,
      onRemove: () => {
        setSearchInput("")
        setParams({ search: "", page: 1 })
      },
    },
    params.role && {
      key: "role",
      label: ROLE_LABELS[params.role] ?? params.role,
      onRemove: () => setParams({ role: "", page: 1 }),
    },
    params.status && {
      key: "status",
      label: STATUS_LABELS[params.status] ?? params.status,
      onRemove: () => setParams({ status: "", page: 1 }),
    },
  ].filter((filter): filter is ActiveFilter => Boolean(filter))

  function handleAdd() {
    setEditingUser(null)
    setFormOpen(true)
  }

  function handleEdit(user: User) {
    setEditingUser(user)
    setFormOpen(true)
  }

  async function handleConfirmDelete(user: User) {
    setIsDeleting(true)
    try {
      await deleteUser(user.id)
      toast.success("User deleted.")
      setDeletingUser(null)
      refetch()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete user.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Users"
        actions={
          <Button onClick={handleAdd}>
            <PlusIcon data-icon="inline-start" />
            Add User
          </Button>
        }
      />

      <FilterToolbar>
        <FilterSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search users..."
          disabled={isLoading || isError}
        />

        <Select
          value={params.role || ANY_ROLE}
          onValueChange={(value) => setParams({ role: value === ANY_ROLE ? "" : (value ?? ""), page: 1 })}
          disabled={isLoading || isError}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_ROLE}>{ANY_ROLE}</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={params.status || ANY_STATUS}
          onValueChange={(value) => setParams({ status: value === ANY_STATUS ? "" : (value ?? ""), page: 1 })}
          disabled={isLoading || isError}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_STATUS}>{ANY_STATUS}</SelectItem>
            {USER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SortControl
          value={params.sortBy}
          direction={params.sortDir}
          options={SORT_OPTIONS}
          onChange={(sortBy, sortDir) => setParams({ sortBy, sortDir, page: 1 })}
          disabled={isLoading || isError}
        />

        <ActiveFilterChips
          filters={activeFilters}
          onClearAll={hasActiveFilters ? clearFilters : undefined}
          disabled={isLoading || isError}
        />
      </FilterToolbar>

      <UserTable
        users={users}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        hasActiveFilters={hasActiveFilters}
        searchTerm={params.search}
        currentUserId={currentUser?.id}
        currentUserRole={currentUserRole}
        onClearFilters={clearFilters}
        onCreate={handleAdd}
        onEdit={handleEdit}
        onDelete={setDeletingUser}
      />

      {total > 0 && (
        <PaginationBar
          page={params.page}
          pageSize={params.pageSize}
          total={total}
          itemLabel="users"
          onPageChange={(page) => setParams({ page })}
          onPageSizeChange={(pageSize) => setParams({ pageSize, page: 1 })}
          disabled={isLoading || isFetching || isError}
        />
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        currentUserId={currentUser?.id}
        onSaved={refetch}
      />

      <DeleteUserDialog
        user={deletingUser}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
