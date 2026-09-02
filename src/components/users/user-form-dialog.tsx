import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLES,
  useUserActions,
  type Role,
  type User,
  type UserInput,
} from "@/lib/users"

const ROLE_LABELS: Record<Role, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Super Admin",
}

function emptyDraft(): UserInput {
  return {
    firstName: "",
    lastName: "",
    username: "",
    role: "staff",
    permissions: [],
    status: "active",
    password: "",
  }
}

function draftFromUser(user: User): UserInput {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    status: user.status,
    password: "",
  }
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  currentUserId?: string | null
  onSaved?: () => void
}) {
  const { addUser, updateUser } = useUserActions()
  const [draft, setDraft] = useState<UserInput>(emptyDraft)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UserInput, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(user ? draftFromUser(user) : emptyDraft())
    setFieldErrors({})
  }, [open, user])

  function togglePermission(key: (typeof PERMISSION_KEYS)[number]) {
    setDraft((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: Partial<Record<keyof UserInput, string>> = {}
    if (!draft.firstName.trim()) errors.firstName = "First name is required."
    if (!draft.lastName.trim()) errors.lastName = "Last name is required."
    if (!draft.username.trim()) errors.username = "Username is required."
    if (!user && !draft.password?.trim()) errors.password = "Password is required."
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (user) {
        await updateUser(user.id, draft)
        toast.success("User updated.")
      } else {
        await addUser(draft)
        toast.success("User created.")
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to save user.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {user ? "Update this user's account details." : "Add a new staff, admin, or super admin account."}
          </DialogDescription>
        </DialogHeader>

        <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={!!fieldErrors.firstName}>
                <FieldLabel htmlFor="user-first-name">First Name</FieldLabel>
                <Input
                  id="user-first-name"
                  value={draft.firstName}
                  onChange={(event) => {
                    setDraft((prev) => ({ ...prev, firstName: event.target.value }))
                    setFieldErrors((prev) => ({ ...prev, firstName: undefined }))
                  }}
                  aria-invalid={!!fieldErrors.firstName}
                  placeholder="Juan"
                />
                <FieldError>{fieldErrors.firstName}</FieldError>
              </Field>

              <Field data-invalid={!!fieldErrors.lastName}>
                <FieldLabel htmlFor="user-last-name">Last Name</FieldLabel>
                <Input
                  id="user-last-name"
                  value={draft.lastName}
                  onChange={(event) => {
                    setDraft((prev) => ({ ...prev, lastName: event.target.value }))
                    setFieldErrors((prev) => ({ ...prev, lastName: undefined }))
                  }}
                  aria-invalid={!!fieldErrors.lastName}
                  placeholder="Dela Cruz"
                />
                <FieldError>{fieldErrors.lastName}</FieldError>
              </Field>
            </div>

            <Field data-invalid={!!fieldErrors.username}>
              <FieldLabel htmlFor="user-username">Username</FieldLabel>
              <Input
                id="user-username"
                value={draft.username}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, username: event.target.value }))
                  setFieldErrors((prev) => ({ ...prev, username: undefined }))
                }}
                aria-invalid={!!fieldErrors.username}
                placeholder="juan.delacruz"
                autoComplete="off"
              />
              <FieldError>{fieldErrors.username}</FieldError>
            </Field>

            <Field data-invalid={!!fieldErrors.password}>
              <FieldLabel htmlFor="user-password">Password</FieldLabel>
              <PasswordInput
                id="user-password"
                value={draft.password}
                onChange={(event) => {
                  setDraft((prev) => ({ ...prev, password: event.target.value }))
                  setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                aria-invalid={!!fieldErrors.password}
                autoComplete="new-password"
              />
              {user ? (
                <FieldDescription>Leave blank to keep the current password.</FieldDescription>
              ) : null}
              <FieldError>{fieldErrors.password}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="user-role">Role</FieldLabel>
              <Select
                value={draft.role}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, role: value as Role }))}
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Status</FieldLabel>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">
                  {draft.status === "active" ? "Active" : "Inactive"}
                </span>
                <Switch
                  checked={draft.status === "active"}
                  disabled={!!user && user.id === currentUserId}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, status: checked ? "active" : "inactive" }))
                  }
                />
              </div>
              {user && user.id === currentUserId ? (
                <FieldDescription>You cannot deactivate your own account.</FieldDescription>
              ) : null}
            </Field>

            <Field>
              <FieldLabel>Permissions</FieldLabel>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                {PERMISSION_KEYS.map((key) => (
                  <label key={key} className="flex items-center justify-between gap-2 text-sm">
                    {PERMISSION_LABELS[key]}
                    <Switch
                      checked={draft.permissions.includes(key)}
                      onCheckedChange={() => togglePermission(key)}
                    />
                  </label>
                ))}
              </div>
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Saving..." : "Save User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
