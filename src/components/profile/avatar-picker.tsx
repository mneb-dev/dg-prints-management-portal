import { useState } from "react"
import { UserRoundXIcon } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  const [pendingKey, setPendingKey] = useState<string | "none" | null>(null)

  async function handleSelect(key: string | null) {
    setPendingKey(key ?? "none")
    const error = await updateProfile({ avatar: key })
    setPendingKey(null)
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
          <button
            type="button"
            disabled={pendingKey !== null}
            onClick={() => handleSelect(null)}
            className={cn(
              "rounded-full p-0.5 ring-2 ring-transparent transition-all hover:ring-primary/50 disabled:opacity-50",
              user?.avatar == null && "ring-primary"
            )}
          >
            <Avatar size="lg" className="mx-auto">
              <AvatarFallback>
                <UserRoundXIcon className="size-4" />
              </AvatarFallback>
            </Avatar>
          </button>
          {AVATAR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={pendingKey !== null}
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
