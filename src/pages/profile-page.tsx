import { useEffect, useState } from "react"
import { CameraIcon, CheckIcon, CircleIcon, KeyRoundIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { OrderFormSectionHeader } from "@/components/orders/order-form-section-header"
import { AvatarPicker } from "@/components/profile/avatar-picker"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Spinner } from "@/components/ui/spinner"
import { UserAvatarImage } from "@/components/user-avatar-image"
import { useAuth } from "@/lib/auth"
import { PERMISSION_LABELS, ROLE_LABELS, type Role } from "@/lib/users"
import { cn } from "@/lib/utils"
import {
  PASSWORD_RULES,
  PASSWORDS_DO_NOT_MATCH_MESSAGE,
  passwordRequirementMessage,
  requiredMessage,
} from "@/lib/validation"

/** Same role dots as the Users table. */
const ROLE_DOT_CLASS: Record<Role, string> = {
  superadmin: "bg-primary",
  admin: "bg-order-status-violet",
  staff: "bg-muted-foreground/40",
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

/** One ✓/○ row in the live password checklist. */
function RuleCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 transition-colors duration-200",
        met ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {met ? (
        <CheckIcon aria-hidden className="size-3.5 shrink-0 stroke-3 text-order-status-teal" />
      ) : (
        <CircleIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground/50" />
      )}
      <span className="leading-none">{label}</span>
      <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
    </li>
  )
}

export function ProfilePage() {
  const { user, role, updateProfile, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const canEditUsername = role === "superadmin" || role === "admin"

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

  const [profileDraft, setProfileDraft] = useState({ firstName: "", lastName: "", username: "" })
  const [profileErrors, setProfileErrors] = useState<Record<string, string | undefined>>({})
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string | undefined>>({})
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    if (!user) return
    setProfileDraft({ firstName: user.firstName, lastName: user.lastName, username: user.username })
  }, [user])

  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "?"
    : "?"
  const fullName = user ? `${user.firstName} ${user.lastName}` : ""

  const isProfileDirty =
    !!user &&
    (profileDraft.firstName !== user.firstName ||
      profileDraft.lastName !== user.lastName ||
      profileDraft.username !== user.username)
  const canSubmitPassword = !!currentPassword && !!newPassword && !!confirmPassword
  const passwordsMatch = !!newPassword && !!confirmPassword && newPassword === confirmPassword

  function discardProfileChanges() {
    if (!user) return
    setProfileDraft({ firstName: user.firstName, lastName: user.lastName, username: user.username })
    setProfileErrors({})
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Record<string, string | undefined> = {}
    if (!profileDraft.firstName.trim()) errors.firstName = requiredMessage("First name")
    if (!profileDraft.lastName.trim()) errors.lastName = requiredMessage("Last name")
    if (!profileDraft.username.trim()) errors.username = requiredMessage("Username")
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      return
    }

    setIsSavingProfile(true)
    const error = await updateProfile(profileDraft)
    setIsSavingProfile(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success("Profile updated.")
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Record<string, string | undefined> = {}
    if (!currentPassword) errors.currentPassword = requiredMessage("Current password")
    const requirementError = passwordRequirementMessage(newPassword)
    if (requirementError) errors.newPassword = requirementError
    if (newPassword !== confirmPassword) errors.confirmPassword = PASSWORDS_DO_NOT_MATCH_MESSAGE
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setIsSavingPassword(true)
    const error = await changePassword(currentPassword, newPassword)
    setIsSavingPassword(false)
    if (error) {
      toast.error(error)
      return
    }

    toast.success("Password changed. Please sign in again.")
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <PageHeader title="Profile" description="Your account, sign-in and access." />

      {/* Identity hero */}
      <Card className="gap-0 py-0">
        <div
          aria-hidden
          className="h-24 bg-linear-to-br from-primary/20 via-accent to-order-status-violet/15"
        />
        <div className="flex flex-col items-center gap-4 px-6 pb-6 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="relative -mt-12 shrink-0">
            <button
              type="button"
              onClick={() => setAvatarPickerOpen(true)}
              aria-label="Change avatar"
              className="group/avatar-button block rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Avatar className="size-24 bg-card ring-4 ring-card transition-[scale] duration-200 ease-out group-hover/avatar-button:scale-[1.03] motion-reduce:transition-none">
                <UserAvatarImage avatarKey={user?.avatar} alt={fullName} />
                <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <span className="absolute right-0.5 bottom-0.5 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-elevated)] ring-3 ring-card transition-transform duration-200 group-hover/avatar-button:scale-110 motion-reduce:transition-none">
                <CameraIcon className="size-4" />
              </span>
            </button>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:pb-1">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="truncate font-heading text-xl font-bold tracking-tight">{fullName}</h2>
              <p className="truncate text-sm text-muted-foreground">@{user?.username}</p>
            </div>
            {user && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                <DotBadge dotClass={ROLE_DOT_CLASS[user.role]} label={ROLE_LABELS[user.role]} />
                <DotBadge
                  dotClass={user.status === "active" ? "bg-order-status-teal" : "bg-muted-foreground/40"}
                  label={user.status === "active" ? "Active" : "Inactive"}
                />
                {user.permissions.map((key) => (
                  <Badge key={key} variant="outline" className="font-normal text-muted-foreground">
                    {PERMISSION_LABELS[key]}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" className="sm:mb-1" onClick={() => setAvatarPickerOpen(true)}>
            <CameraIcon data-icon="inline-start" />
            Change avatar
          </Button>
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Personal details */}
        <Card>
          <form onSubmit={handleSaveProfile} className="contents">
            <CardHeader>
              <OrderFormSectionHeader
                icon={UserRoundIcon}
                title="Personal details"
                description="How your name appears on orders and records."
              />
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!profileErrors.firstName}>
                    <FieldLabel htmlFor="profile-first-name">First name</FieldLabel>
                    <Input
                      id="profile-first-name"
                      value={profileDraft.firstName}
                      onChange={(event) => {
                        setProfileDraft((prev) => ({ ...prev, firstName: event.target.value }))
                        setProfileErrors((prev) => ({ ...prev, firstName: undefined }))
                      }}
                      aria-invalid={!!profileErrors.firstName}
                    />
                    <FieldError>{profileErrors.firstName}</FieldError>
                  </Field>
                  <Field data-invalid={!!profileErrors.lastName}>
                    <FieldLabel htmlFor="profile-last-name">Last name</FieldLabel>
                    <Input
                      id="profile-last-name"
                      value={profileDraft.lastName}
                      onChange={(event) => {
                        setProfileDraft((prev) => ({ ...prev, lastName: event.target.value }))
                        setProfileErrors((prev) => ({ ...prev, lastName: undefined }))
                      }}
                      aria-invalid={!!profileErrors.lastName}
                    />
                    <FieldError>{profileErrors.lastName}</FieldError>
                  </Field>
                </div>
                <Field data-invalid={!!profileErrors.username}>
                  <FieldLabel htmlFor="profile-username">Username</FieldLabel>
                  <div className="relative">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground"
                    >
                      @
                    </span>
                    <Input
                      id="profile-username"
                      value={profileDraft.username}
                      onChange={(event) => {
                        setProfileDraft((prev) => ({ ...prev, username: event.target.value }))
                        setProfileErrors((prev) => ({ ...prev, username: undefined }))
                      }}
                      aria-invalid={!!profileErrors.username}
                      autoComplete="off"
                      disabled={!canEditUsername}
                      className="pl-6"
                    />
                  </div>
                  {!canEditUsername && (
                    <FieldDescription>Only a super admin can change usernames.</FieldDescription>
                  )}
                  <FieldError>{profileErrors.username}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              {isProfileDirty && (
                <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden className="size-2 shrink-0 translate-y-px rounded-full bg-order-status-gold" />
                  <span className="leading-none">Unsaved changes</span>
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={!isProfileDirty || isSavingProfile}
                onClick={discardProfileChanges}
              >
                Discard
              </Button>
              <Button type="submit" disabled={!isProfileDirty || isSavingProfile}>
                {isSavingProfile && <Spinner data-icon="inline-start" />}
                {isSavingProfile ? "Saving…" : "Save changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Security */}
        <Card>
          <form onSubmit={handleChangePassword} className="contents">
            <CardHeader>
              <OrderFormSectionHeader
                icon={ShieldCheckIcon}
                title="Security"
                description="Change your password. You'll sign in again after."
              />
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!passwordErrors.currentPassword}>
                  <FieldLabel htmlFor="profile-current-password">Current password</FieldLabel>
                  <PasswordInput
                    id="profile-current-password"
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value)
                      setPasswordErrors((prev) => ({ ...prev, currentPassword: undefined }))
                    }}
                    aria-invalid={!!passwordErrors.currentPassword}
                    autoComplete="current-password"
                  />
                  <FieldError>{passwordErrors.currentPassword}</FieldError>
                </Field>
                <Field data-invalid={!!passwordErrors.newPassword}>
                  <FieldLabel htmlFor="profile-new-password">New password</FieldLabel>
                  <PasswordInput
                    id="profile-new-password"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value)
                      setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }))
                    }}
                    aria-invalid={!!passwordErrors.newPassword}
                    aria-describedby="profile-password-rules"
                    autoComplete="new-password"
                  />
                  <ul
                    id="profile-password-rules"
                    aria-label="Password requirements"
                    className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs sm:grid-cols-2"
                  >
                    {PASSWORD_RULES.map((rule) => (
                      <RuleCheck key={rule.label} met={rule.test(newPassword)} label={rule.label} />
                    ))}
                  </ul>
                  <FieldError>{passwordErrors.newPassword}</FieldError>
                </Field>
                <Field data-invalid={!!passwordErrors.confirmPassword}>
                  <FieldLabel htmlFor="profile-confirm-password">Confirm new password</FieldLabel>
                  <PasswordInput
                    id="profile-confirm-password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value)
                      setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                    }}
                    aria-invalid={!!passwordErrors.confirmPassword}
                    autoComplete="new-password"
                  />
                  {passwordsMatch && !passwordErrors.confirmPassword && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckIcon aria-hidden className="size-3.5 stroke-3 text-order-status-teal" />
                      <span className="leading-none">Passwords match</span>
                    </p>
                  )}
                  <FieldError>{passwordErrors.confirmPassword}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="submit" disabled={!canSubmitPassword || isSavingPassword}>
                {isSavingPassword ? <Spinner data-icon="inline-start" /> : <KeyRoundIcon data-icon="inline-start" />}
                {isSavingPassword ? "Saving…" : "Change password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <AvatarPicker open={avatarPickerOpen} onOpenChange={setAvatarPickerOpen} />
    </div>
  )
}
