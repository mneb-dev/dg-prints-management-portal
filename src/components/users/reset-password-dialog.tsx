import { useState } from "react"
import { CopyIcon, KeyRoundIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { copyToClipboard } from "@/lib/clipboard"
import type { User } from "@/lib/users"

export function ResetPasswordDialog({
  user,
  onOpenChange,
  onConfirm,
}: {
  user: User | null
  onOpenChange: (open: boolean) => void
  onConfirm: (user: User) => Promise<string>
}) {
  const [isResetting, setIsResetting] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  function handleOpenChange(open: boolean) {
    if (!open) {
      setGeneratedPassword(null)
      setIsResetting(false)
    }
    onOpenChange(open)
  }

  async function handleConfirm() {
    if (!user) return
    setIsResetting(true)
    try {
      const password = await onConfirm(user)
      setGeneratedPassword(password)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to reset password.")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <AlertDialog open={!!user} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        {generatedPassword ? (
          <>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-primary/10 text-primary">
                <KeyRoundIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Password reset</AlertDialogTitle>
              <AlertDialogDescription>
                Copy this password now — it won't be shown again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={generatedPassword} className="font-mono" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(generatedPassword)}
                aria-label="Copy password"
              >
                <CopyIcon />
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => handleOpenChange(false)}>Done</AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-primary/10 text-primary">
                <KeyRoundIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Reset password</AlertDialogTitle>
              <AlertDialogDescription>
                Reset the password for{" "}
                <span className="font-medium text-foreground">
                  {user ? `${user.firstName} ${user.lastName}` : ""}
                </span>
                ? This immediately replaces their current password with a new, randomly generated
                one.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={isResetting} onClick={handleConfirm}>
                {isResetting && <Spinner data-icon="inline-start" />}
                {isResetting ? "Resetting..." : "Reset Password"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
