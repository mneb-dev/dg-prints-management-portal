import { type MouseEvent, type ReactNode } from "react"
import {
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TABLE_HEAD_CLASS, TABLE_HEADER_CLASS, TABLE_SURFACE_CLASS } from "@/components/table-surface"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatarImage } from "@/components/user-avatar-image"
import { cn, formatDate } from "@/lib/utils"
import { canManageUser, PERMISSION_LABELS, ROLE_LABELS, type Role, type User, type UserStatus } from "@/lib/users"

const ROLE_DOT_CLASS: Record<Role, string> = {
  superadmin: "bg-primary",
  admin: "bg-order-status-violet",
  staff: "bg-muted-foreground/40",
}

const STATUS_DOT_CLASS: Record<UserStatus, string> = {
  active: "bg-order-status-teal",
  inactive: "bg-muted-foreground/40",
}

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
}

function initials(user: User): string {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "?"
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation()
}

/** Neutral chip + dot (docs/design-system.md). */
function DotBadge({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <Badge variant="secondary" className="gap-1.5">
      <span aria-hidden className={cn("size-2 shrink-0 translate-y-px rounded-full", dotClass)} />
      <span className="leading-none">{label}</span>
    </Badge>
  )
}

function Columns() {
  return (
    <TableHeader className={TABLE_HEADER_CLASS}>
      <TableRow className="hover:bg-transparent">
        <TableHead className={TABLE_HEAD_CLASS}>User</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Role</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Status</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Access</TableHead>
        <TableHead className={TABLE_HEAD_CLASS}>Joined</TableHead>
        <TableHead className={cn(TABLE_HEAD_CLASS, "w-0 text-right")}>
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

function AccessCell({ user }: { user: User }) {
  const count = user.permissions.length
  if (count === 0) return <span className="text-muted-foreground">—</span>
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span />}
        onClick={stopRowClick}
        className="cursor-default text-muted-foreground underline decoration-dotted underline-offset-4"
      >
        {count} {count === 1 ? "permission" : "permissions"}
      </TooltipTrigger>
      <TooltipContent>
        <ul className="flex flex-col gap-0.5">
          {user.permissions.map((key) => (
            <li key={key}>{PERMISSION_LABELS[key]}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

export function UserTable({
  footer,
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
  /** Rendered inside the table surface, below the rows (the pager). Hidden in loading/empty/error states. */
  footer?: ReactNode
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
      <div className={TABLE_SURFACE_CLASS}>
        <Table>
          <Columns />
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex justify-end gap-1">
                    <Skeleton className="size-7 rounded-md" />
                    <Skeleton className="size-7 rounded-md" />
                  </div>
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
      <Empty className={TABLE_SURFACE_CLASS}>
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
        <Empty className={TABLE_SURFACE_CLASS}>
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
      <Empty className={TABLE_SURFACE_CLASS}>
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
            Add user
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="relative" aria-busy={isFetching}>
      <div className={cn(TABLE_SURFACE_CLASS, isFetching && "opacity-60 transition-opacity duration-150")}>
        <Table>
          <Columns />
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              const editable = currentUserRole ? canManageUser(currentUserRole, user) : false
              const deletable = !isSelf && editable
              const fullName = `${user.firstName} ${user.lastName}`
              const inactive = user.status !== "active"

              return (
                <TableRow
                  key={user.id}
                  // Managers open the editor by clicking anywhere on the row (like Products/Expenses).
                  onClick={
                    editable
                      ? () => {
                          if (window.getSelection()?.toString()) return
                          onEdit(user)
                        }
                      : undefined
                  }
                  className={cn(
                    editable ? "cursor-pointer transition-colors duration-150 hover:bg-accent/40" : "hover:bg-transparent"
                  )}
                >
                  <TableCell className="max-w-80 px-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className={cn(inactive && "opacity-60 grayscale")}>
                        <UserAvatarImage avatarKey={user.avatar} alt={fullName} />
                        <AvatarFallback>{initials(user)}</AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={cn("truncate font-medium", inactive && "text-muted-foreground")}>
                            {fullName}
                          </span>
                          {isSelf && (
                            <Badge variant="outline" className="h-4.5 px-1.5 text-[0.65rem]">
                              You
                            </Badge>
                          )}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <DotBadge dotClass={ROLE_DOT_CLASS[user.role]} label={ROLE_LABELS[user.role]} />
                  </TableCell>
                  <TableCell className="px-4">
                    <DotBadge dotClass={STATUS_DOT_CLASS[user.status]} label={STATUS_LABELS[user.status]} />
                  </TableCell>
                  <TableCell className="px-4 whitespace-nowrap">
                    <AccessCell user={user} />
                  </TableCell>
                  <TableCell className="px-4 whitespace-nowrap text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="px-4" onClick={stopRowClick}>
                    <div className="flex justify-end gap-1">
                      {editable && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${fullName}`}
                                onClick={() => onEdit(user)}
                              />
                            }
                          >
                            <PencilIcon />
                          </TooltipTrigger>
                          <TooltipContent>Edit user</TooltipContent>
                        </Tooltip>
                      )}
                      {deletable && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="More actions"
                                className="data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                              />
                            }
                          >
                            <MoreHorizontalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem variant="destructive" onClick={() => onDelete(user)}>
                              <Trash2Icon />
                              <span className="leading-none">Delete user</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {footer}
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
