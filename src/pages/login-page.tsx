import { useId, useState, type SubmitEvent } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth"
import { requiredMessage } from "@/lib/validation"

export function LoginPage() {
  const usernameId = useId()
  const passwordId = useId()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const username = String(formData.get("username") ?? "")
    const password = String(formData.get("password") ?? "")

    const errors: { username?: string; password?: string } = {}
    if (!username.trim()) errors.username = requiredMessage("Username")
    if (!password) errors.password = requiredMessage("Password")
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setError(null)

    setIsSubmitting(true)
    const loginError = await login(username, password)
    setIsSubmitting(false)

    if (!loginError) {
      navigate("/dashboard", { replace: true })
      return
    }

    setError(loginError)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to DG Prints</CardTitle>
          <CardDescription>Enter your username and password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={!!fieldErrors.username}>
                <FieldLabel htmlFor={usernameId}>Username</FieldLabel>
                <Input
                  id={usernameId}
                  name="username"
                  type="text"
                  autoComplete="username"
                  aria-invalid={!!fieldErrors.username}
                  onChange={() => setFieldErrors((prev) => ({ ...prev, username: undefined }))}
                />
                <FieldError>{fieldErrors.username}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.password || !!error}>
                <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
                <PasswordInput
                  id={passwordId}
                  name="password"
                  autoComplete="current-password"
                  aria-invalid={!!fieldErrors.password || !!error}
                  onChange={() => setFieldErrors((prev) => ({ ...prev, password: undefined }))}
                />
                <FieldError>{fieldErrors.password ?? error}</FieldError>
              </Field>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner data-icon="inline-start" />}
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
