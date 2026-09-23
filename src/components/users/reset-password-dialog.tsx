import { useState } from "react"
import { CopyIcon, KeyRoundIcon } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  // Two steps in one dialog: the question, then the one-time result with a single "Done".
  return (
    <ConfirmDialog
      open={!!user}
      onOpenChange={handleOpenChange}
      tone="primary"
      icon={KeyRoundIcon}
      title={
        generatedPassword ? (
          "Password reset"
        ) : (
          <>
            Reset <Name>{user ? `${user.firstName} ${user.lastName}` : ""}</Name>'s password?
          </>
        )
      }
      description={
        generatedPassword
          ? "Copy it now — it won't be shown again."
          : "Their current password is replaced right away with a new random one."
      }
      confirmLabel={generatedPassword ? "Done" : "Yes, reset it"}
      pendingLabel="Resetting…"
      cancelLabel={generatedPassword ? null : "No, keep it"}
      isPending={isResetting}
      onConfirm={generatedPassword ? () => handleOpenChange(false) : handleConfirm}
    >
      {generatedPassword ? (
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
      ) : null}
    </ConfirmDialog>
  )
}
