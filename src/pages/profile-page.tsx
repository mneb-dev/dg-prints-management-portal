import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { AvatarPicker } from "@/components/profile/avatar-picker"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { useAuth } from "@/lib/auth"
import { getAvatarDataUri } from "@/lib/avatars"
import type { Role } from "@/lib/users-slice"

const ROLE_LABELS: Record<Role, string> = {
  staff: "Staff",
  admin: "Admin",
  superadmin: "Super Admin",
}

function passwordRequirementError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters."
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter."
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter."
  if (!/\d/.test(password)) return "Password must include a number."
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character."
  return null
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

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Record<string, string | undefined> = {}
    if (!profileDraft.firstName.trim()) errors.firstName = "First name is required."
    if (!profileDraft.lastName.trim()) errors.lastName = "Last name is required."
    if (!profileDraft.username.trim()) errors.username = "Username is required."
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
    if (!currentPassword) errors.currentPassword = "Current password is required."
    const requirementError = passwordRequirementError(newPassword)
    if (requirementError) errors.newPassword = requirementError
    if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match."
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
    <div className="flex flex-col gap-4">
      <PageHeader title="Profile" description="View and manage your account." />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Choose a picture to represent you.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar size="lg">
            {user?.avatar && <AvatarImage src={getAvatarDataUri(user.avatar)} alt={user.username} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" onClick={() => setAvatarPickerOpen(true)}>
            Change avatar
          </Button>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Your role is <Badge variant="outline">{user ? ROLE_LABELS[user.role] : ""}</Badge> and can only be
            changed by a super admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!profileErrors.firstName}>
                  <FieldLabel htmlFor="profile-first-name">First Name</FieldLabel>
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
                  <FieldLabel htmlFor="profile-last-name">Last Name</FieldLabel>
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
                />
                {!canEditUsername && (
                  <FieldDescription>Only a super admin can change usernames.</FieldDescription>
                )}
                <FieldError>{profileErrors.username}</FieldError>
              </Field>
              <Field>
                <Button type="submit" disabled={isSavingProfile} className="self-start">
                  {isSavingProfile ? "Saving..." : "Save changes"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            You'll be signed out and asked to log in again after changing your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <FieldGroup>
              <Field data-invalid={!!passwordErrors.currentPassword}>
                <FieldLabel htmlFor="profile-current-password">Current Password</FieldLabel>
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
                <FieldLabel htmlFor="profile-new-password">New Password</FieldLabel>
                <PasswordInput
                  id="profile-new-password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }))
                  }}
                  aria-invalid={!!passwordErrors.newPassword}
                  autoComplete="new-password"
                />
                <FieldDescription>
                  At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special
                  character.
                </FieldDescription>
                <FieldError>{passwordErrors.newPassword}</FieldError>
              </Field>
              <Field data-invalid={!!passwordErrors.confirmPassword}>
                <FieldLabel htmlFor="profile-confirm-password">Confirm New Password</FieldLabel>
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
                <FieldError>{passwordErrors.confirmPassword}</FieldError>
              </Field>
              <Field>
                <Button type="submit" disabled={isSavingPassword} className="self-start">
                  {isSavingPassword ? "Saving..." : "Change password"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <AvatarPicker open={avatarPickerOpen} onOpenChange={setAvatarPickerOpen} />
    </div>
  )
}
