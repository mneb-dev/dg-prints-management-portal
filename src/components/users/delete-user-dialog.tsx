import { Trash2Icon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { User } from "@/lib/users"

export function DeleteUserDialog({
  user,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  user: User | null
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (user: User) => void
}) {
  return (
    <ConfirmDialog
      open={!!user}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={Trash2Icon}
      title={<>Delete user <Name>{user ? `${user.firstName} ${user.lastName}` : ""}</Name>?</>}
      description={"This can't be undone."}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      isPending={isDeleting}
      onConfirm={() => user && onConfirm(user)}
    />
  )
}
