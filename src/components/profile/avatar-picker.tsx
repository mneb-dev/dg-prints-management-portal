import { useEffect, useState } from "react"
import { CheckIcon, SmileIcon, UserRoundXIcon } from "lucide-react"
import { toast } from "sonner"

import { FormDialogHeader } from "@/components/form-dialog-header"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { UserAvatarImage } from "@/components/user-avatar-image"
import { useAuth } from "@/lib/auth"
import { AVATAR_PACKS, getAvatarPackId, preloadAvatarPack, type AvatarPackId } from "@/lib/avatars"
import { cn } from "@/lib/utils"

/** One avatar option: selected = primary ring + ✓ (same language as ChoiceTile/ChoiceCard). */
function AvatarOption({
  label,
  selected,
  pending,
  disabled,
  onSelect,
  children,
}: {
  label: string
  selected: boolean
  pending: boolean
  disabled: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group/option relative mx-auto rounded-full p-0.5 ring-2 ring-transparent outline-none",
        "transition-[scale,box-shadow] duration-200 ease-out hover:scale-105 hover:ring-primary/40 motion-reduce:hover:scale-100",
        "focus-visible:ring-ring/60 disabled:cursor-not-allowed",
        selected && "ring-primary hover:ring-primary"
      )}
    >
      <Avatar className="size-12 sm:size-14">{children}</Avatar>
      {pending && (
        <span className="absolute inset-0.5 flex items-center justify-center rounded-full bg-background/70">
          <Spinner className="size-4" />
        </span>
      )}
      {selected && !pending && (
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-popover"
        >
          <CheckIcon className="size-3 stroke-3" />
        </span>
      )}
    </button>
  )
}

export function AvatarPicker({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user, updateProfile } = useAuth()
  const [pendingKey, setPendingKey] = useState<string | "none" | null>(null)
  const [packId, setPackId] = useState<AvatarPackId>("classic")

  // Open on the pack the current avatar belongs to.
  useEffect(() => {
    if (open) setPackId(getAvatarPackId(user?.avatar))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pack = AVATAR_PACKS.find((entry) => entry.id === packId) ?? AVATAR_PACKS[0]

  async function handleSelect(key: string | null) {
    if (key === (user?.avatar ?? null)) {
      onOpenChange(false)
      return
    }
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
      <DialogContent className="sm:max-w-lg">
        <FormDialogHeader
          icon={SmileIcon}
          title="Choose an avatar"
          description="Pick a style, then a picture to use across the app."
        />

        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <ToggleGroup
            aria-label="Avatar style"
            value={[packId]}
            onValueChange={(next) => {
              const value = next[0] as AvatarPackId | undefined
              if (value) setPackId(value)
            }}
            className={cn(SEGMENT_TRACK_CLASS, "w-max")}
          >
            {AVATAR_PACKS.map((entry) => (
              <Toggle
                key={entry.id}
                value={entry.id}
                className={SEGMENT_CLASS}
                // Start fetching a pack on hover so its avatars are usually ready by the click.
                onPointerEnter={() => preloadAvatarPack(entry.id)}
              >
                {entry.label}
              </Toggle>
            ))}
          </ToggleGroup>
        </div>

        <DialogBody>
          <div
            key={pack.id}
            className="grid animate-in grid-cols-4 gap-3 py-1 duration-200 fade-in-0 motion-reduce:animate-none sm:grid-cols-6"
          >
            <AvatarOption
              label="No avatar"
              selected={user?.avatar == null}
              pending={pendingKey === "none"}
              disabled={pendingKey !== null}
              onSelect={() => handleSelect(null)}
            >
              <AvatarFallback>
                <UserRoundXIcon className="size-5" />
              </AvatarFallback>
            </AvatarOption>
            {pack.keys.map((key, index) => (
              <AvatarOption
                key={key}
                label={`${pack.label} avatar ${index + 1}`}
                selected={user?.avatar === key}
                pending={pendingKey === key}
                disabled={pendingKey !== null}
                onSelect={() => handleSelect(key)}
              >
                <UserAvatarImage avatarKey={key} alt="" />
                {/* Shown until the pack's style has loaded. */}
                <AvatarFallback className="animate-pulse motion-reduce:animate-none" />
              </AvatarOption>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
