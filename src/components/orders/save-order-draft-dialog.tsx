import { FileTextIcon } from "lucide-react"

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

export function SaveOrderDraftDialog({
  open,
  onOpenChange,
  onDiscard,
  onSaveDraft,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
  onSaveDraft: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-primary/10 text-primary">
            <FileTextIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
          <AlertDialogDescription>
            This order hasn't been created yet. You can save it as a draft to pick up later, or
            discard it for good.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive-solid" onClick={onDiscard}>
            Discard
          </AlertDialogAction>
          <AlertDialogAction onClick={onSaveDraft}>Save as Draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
