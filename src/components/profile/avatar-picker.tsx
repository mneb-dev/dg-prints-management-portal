import { useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth"
import { AVATAR_KEYS, getAvatarDataUri } from "@/lib/avatars"
import { cn } from "@/lib/utils"

export function AvatarPicker({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, updateProfile } = useAuth()
  const [savingKey, setSavingKey] = useState<string | null>(null)

  async function handleSelect(key: string) {
    setSavingKey(key)
    const error = await updateProfile({ avatar: key })
    setSavingKey(null)
    if (error) {
      toast.error(error)
      return
    }
    toast.success("Avatar updated.")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose an avatar</DialogTitle>
          <DialogDescription>Pick a picture to use across the app.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={savingKey !== null}
              onClick={() => handleSelect(key)}
              className={cn(
                "rounded-full p-0.5 ring-2 ring-transparent transition-all hover:ring-primary/50 disabled:opacity-50",
                user?.avatar === key && "ring-primary"
              )}
            >
              <Avatar size="lg" className="mx-auto">
                <AvatarImage src={getAvatarDataUri(key)} alt={key} />
              </Avatar>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
