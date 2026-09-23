import { useEffect, useState } from "react"
import { KeyRoundIcon, ShieldCheckIcon, ShieldIcon, UserIcon, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { ChoiceCard } from "@/components/choice-card"
import { ChoiceTile } from "@/components/choice-tile"
import { FormDialogHeader } from "@/components/form-dialog-header"
import { FormSection } from "@/components/form-section"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog"
import {
  canManageUser,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  ROLES,
  USER_STATUSES,
  useUserActions,
  type PermissionKey,
  type Role,
  type User,
  type UserInput,
  type UserStatus,
} from "@/lib/users"
import { cn } from "@/lib/utils"
import { requiredMessage } from "@/lib/validation"

const ROLE_CHOICES: Record<Role, { icon: LucideIcon; hint: string }> = {
  staff: { icon: UserIcon, hint: "Orders and day-to-day work" },
  admin: { icon: ShieldIcon, hint: "Runs the team and the books" },
  superadmin: { icon: ShieldCheckIcon, hint: "Full control, incl. admins" },
}

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
}

function emptyDraft(): UserInput {
  return {
    firstName: "",
    lastName: "",
    username: "",
    role: "staff",
    permissions: [],
    status: "active",
    commissionRate: 100,
    dailyRate: null,
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
    commissionRate: user.commissionRate,
    dailyRate: user.dailyRate,
  }
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  currentUserRole,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  currentUserId?: string | null
  currentUserRole?: Role | null
  onSaved?: () => void
}) {
  const { addUser, updateUser, resetUserPassword } = useUserActions()
  const [draft, setDraft] = useState<UserInput>(emptyDraft)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UserInput, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resettingUser, setResettingUser] = useState<User | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(user ? draftFromUser(user) : emptyDraft())
    setFieldErrors({})
  }, [open, user])

  const canResetPassword = !!user && !!currentUserRole && canManageUser(currentUserRole, user)
  const isSelf = !!user && user.id === currentUserId

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: Partial<Record<keyof UserInput, string>> = {}
    if (!draft.firstName.trim()) errors.firstName = requiredMessage("First name")
    if (!draft.lastName.trim()) errors.lastName = requiredMessage("Last name")
    if (!draft.username.trim()) errors.username = requiredMessage("Username")
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <FormDialogHeader
            icon={UserIcon}
            title={user ? "Edit user" : "New user"}
            description={
              user
                ? "Update this user's profile, access and pay."
                : "Add a staff, admin or super admin account. Use Reset password afterward to set their password."
            }
          />

          <DialogBody>
            <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
              <FormSection step={1} title="Profile" description="Who they are and how they sign in.">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field data-invalid={!!fieldErrors.firstName}>
                      <FieldLabel htmlFor="user-first-name">First name</FieldLabel>
                      <Input
                        id="user-first-name"
                        value={draft.firstName}
                        onChange={(event) => {
                          setDraft((prev) => ({ ...prev, firstName: event.target.value }))
                          setFieldErrors((prev) => ({ ...prev, firstName: undefined }))
                        }}
                        aria-invalid={!!fieldErrors.firstName}
                        placeholder="Juan"
                        autoFocus={!user}
                      />
                      <FieldError>{fieldErrors.firstName}</FieldError>
                    </Field>

                    <Field data-invalid={!!fieldErrors.lastName}>
                      <FieldLabel htmlFor="user-last-name">Last name</FieldLabel>
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
                </FieldGroup>
              </FormSection>

              <FormSection step={2} title="Access" description="What they can see and change.">
                <FieldGroup>
                  <Field>
                    <FieldLabel id="user-role-label">Role</FieldLabel>
                    <ToggleGroup
                      aria-labelledby="user-role-label"
                      value={[draft.role]}
                      onValueChange={(next) => {
                        const value = next[0] as Role | undefined
                        if (value) setDraft((prev) => ({ ...prev, role: value }))
                      }}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                    >
                      {ROLES.map((role) => (
                        <ChoiceCard
                          key={role}
                          value={role}
                          icon={ROLE_CHOICES[role].icon}
                          title={ROLE_LABELS[role]}
                          description={ROLE_CHOICES[role].hint}
                          className="p-3"
                        />
                      ))}
                    </ToggleGroup>
                  </Field>

                  <Field>
                    <FieldLabel id="user-status-label">Status</FieldLabel>
                    <ToggleGroup
                      aria-labelledby="user-status-label"
                      value={[draft.status]}
                      onValueChange={(next) => {
                        const value = next[0] as UserStatus | undefined
                        if (value) setDraft((prev) => ({ ...prev, status: value }))
                      }}
                      disabled={isSelf}
                      className={cn(SEGMENT_TRACK_CLASS, "w-fit")}
                    >
                      {USER_STATUSES.map((status) => (
                        <Toggle key={status} value={status} className={SEGMENT_CLASS}>
                          <span
                            aria-hidden
                            className={cn(
                              "size-2 shrink-0 translate-y-px rounded-full",
                              status === "active" ? "bg-order-status-teal" : "bg-muted-foreground/40"
                            )}
                          />
                          <span className="leading-none">{STATUS_LABELS[status]}</span>
                        </Toggle>
                      ))}
                    </ToggleGroup>
                    <FieldDescription>
                      {isSelf
                        ? "You can't deactivate your own account."
                        : "Inactive users can't sign in, but their history is kept."}
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel id="user-permissions-label">Permissions</FieldLabel>
                    <ToggleGroup
                      multiple
                      aria-labelledby="user-permissions-label"
                      value={draft.permissions}
                      onValueChange={(next) =>
                        setDraft((prev) => ({ ...prev, permissions: next as PermissionKey[] }))
                      }
                      className="flex flex-wrap gap-2"
                    >
                      {PERMISSION_KEYS.map((key) => (
                        <ChoiceTile key={key} value={key}>
                          {PERMISSION_LABELS[key]}
                        </ChoiceTile>
                      ))}
                    </ToggleGroup>
                  </Field>
                </FieldGroup>
              </FormSection>

              <FormSection step={3} title="Pay" description="Used by Incentives and Run payroll.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="user-commission-rate">Commission rate (%)</FieldLabel>
                    <Input
                      id="user-commission-rate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={draft.commissionRate}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, commissionRate: Number(event.target.value) }))
                      }
                    />
                    <FieldDescription>Share of the layout fee when they're set as Layout by.</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="user-daily-rate">Daily rate</FieldLabel>
                    <Input
                      id="user-daily-rate"
                      type="number"
                      min={0}
                      step={0.01}
                      value={draft.dailyRate ?? ""}
                      placeholder="No daily rate"
                      onChange={(event) => {
                        const value = event.target.value
                        setDraft((prev) => ({ ...prev, dailyRate: value === "" ? null : Number(value) }))
                      }}
                    />
                    <FieldDescription>Fixed per-day pay on top of commission.</FieldDescription>
                  </Field>
                </div>
              </FormSection>
            </form>
          </DialogBody>

          <DialogFooter>
            {canResetPassword && (
              <Button
                type="button"
                variant="ghost"
                className="sm:mr-auto"
                onClick={() => setResettingUser(user)}
              >
                <KeyRoundIcon data-icon="inline-start" />
                Reset password
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting ? "Saving…" : user ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResetPasswordDialog
        user={resettingUser}
        onOpenChange={(open) => !open && setResettingUser(null)}
        onConfirm={(target) => resetUserPassword(target.id)}
      />
    </>
  )
}
