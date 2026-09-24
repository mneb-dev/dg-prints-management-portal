import { useRef, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

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
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export type ConfirmTone = "danger" | "warning" | "primary"

const TONE_MEDIA: Record<ConfirmTone, string> = {
  danger: "bg-destructive/10 text-destructive ring-destructive/5",
  warning: "bg-status-warning/10 text-status-warning ring-status-warning/5",
  primary: "bg-accent text-accent-foreground ring-accent/40",
}

/** Highlights the thing being acted on inside a title/description ("Delete product <Name>…?"). */
export function Name({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-foreground">{children}</span>
}

/**
 * The app's one confirmation modal. Every "are you sure?" follows the same pattern
 * (docs/design-system.md → Modals):
 *  - the title is a **question** ("Cancel order ORD-042?"),
 *  - the buttons **answer** it: confirm is the verb ("Delete"), dismiss "Keep" (default),
 *  - `tone` sets the icon tile and the confirm button: danger = solid red, and focus starts on
 *    the safe dismiss button so Enter never destroys anything by accident.
 * Richer confirmations (record payment, request OR, payroll) pass their fields as `children`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  tone = "primary",
  icon: Icon,
  title,
  description,
  children,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Keep",
  secondaryAction,
  isPending = false,
  confirmDisabled = false,
  onConfirm,
  size = "default",
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tone?: ConfirmTone
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** Extra body between the description and the buttons (fields, summaries). */
  children?: ReactNode
  confirmLabel: string
  /** Shown with a spinner while `isPending` (e.g. "Deleting…"). Defaults to confirmLabel. */
  pendingLabel?: string
  /** Dismiss answer. `null` hides it (single-button info dialogs). */
  cancelLabel?: string | null
  /** A third, middle choice — e.g. "Save draft" between "Stay" and "Discard". */
  secondaryAction?: { label: string; onClick: () => void }
  isPending?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
  size?: "default" | "sm"
  className?: string
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent
        size={size}
        className={className}
        // Danger starts on the safe answer; everything else on the confirm.
        initialFocus={tone === "danger" && cancelLabel !== null ? cancelRef : confirmRef}
      >
        <AlertDialogHeader>
          <AlertDialogMedia className={TONE_MEDIA[tone]}>
            <Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>

        {children ? <div className="flex flex-col gap-3">{children}</div> : null}

        <AlertDialogFooter className={cn(secondaryAction && "sm:[&>*:first-child]:mr-auto")}>
          {cancelLabel !== null && (
            <AlertDialogCancel ref={cancelRef} variant="ghost" disabled={isPending}>
              {cancelLabel}
            </AlertDialogCancel>
          )}
          {secondaryAction && (
            <AlertDialogAction variant="outline" disabled={isPending} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            ref={confirmRef}
            variant={tone === "danger" ? "destructive-solid" : "default"}
            disabled={isPending || confirmDisabled}
            onClick={onConfirm}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
