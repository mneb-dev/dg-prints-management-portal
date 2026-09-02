import {
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { PERMISSION_LABELS, type Role, type User, type UserStatus } from "@/lib/users"

const ROLE_BADGE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  superadmin: "default",
  admin: "secondary",
  staff: "outline",
}

const ROLE_LABELS: Record<Role, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Super Admin",
}

const STATUS_BADGE_VARIANT: Record<UserStatus, "success" | "secondary"> = {
  active: "success",
  inactive: "secondary",
}

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
}

function canDelete(actorRole: Role, target: User): boolean {
  return !(actorRole === "admin" && target.role === "superadmin")
}

function canEdit(actorRole: Role, target: User): boolean {
  return !(actorRole === "admin" && target.role === "superadmin")
}

export function UserTable({
  users,
  isLoading,
  isFetching,
  isError,
  error,
  hasActiveFilters,
  searchTerm,
  currentUserId,
  currentUserRole,
  onClearFilters,
  onCreate,
  onEdit,
  onDelete,
}: {
  users: User[]
  isLoading?: boolean
  isFetching?: boolean
  isError?: boolean
  error?: string | null
  hasActiveFilters?: boolean
  searchTerm?: string
  currentUserId?: string | null
  currentUserRole: Role | null
  onClearFilters?: () => void
  onCreate?: () => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto h-7 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Couldn't load users</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (users.length === 0) {
    if (hasActiveFilters) {
      return (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No users match your {searchTerm ? "search" : "filters"}</EmptyTitle>
            <EmptyDescription>
              {searchTerm
                ? `No results for "${searchTerm}". Try a different search or clear your filters.`
                : "Try adjusting or clearing your filters."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <XIcon data-icon="inline-start" />
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )
    }
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>No users yet</EmptyTitle>
          <EmptyDescription>Get started by adding your first user.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={onCreate}>
            <PlusIcon data-icon="inline-start" />
            Add User
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="relative" aria-busy={isFetching}>
      <div className={cn("rounded-lg border", isFetching && "opacity-60 transition-opacity duration-150")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              const deletable = !isSelf && (currentUserRole ? canDelete(currentUserRole, user) : false)
              const editable = currentUserRole ? canEdit(currentUserRole, user) : false

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_BADGE_VARIANT[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[user.status]}>
                      {STATUS_LABELS[user.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.permissions.length > 0
                      ? user.permissions.map((key) => PERMISSION_LABELS[key]).join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {editable && (
                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(user)}>
                          <PencilIcon />
                          <span className="sr-only">
                            Edit {user.firstName} {user.lastName}
                          </span>
                        </Button>
                      )}
                      {deletable && (
                        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(user)}>
                          <Trash2Icon />
                          <span className="sr-only">
                            Delete {user.firstName} {user.lastName}
                          </span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {isFetching && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border">
          <Loader2Icon className="size-3.5 animate-spin" />
          Updating…
        </div>
      )}
    </div>
  )
}
