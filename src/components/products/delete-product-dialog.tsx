import { Trash2Icon } from "lucide-react"

import { ConfirmDialog, Name } from "@/components/confirm-dialog"
import type { Product } from "@/lib/products"

export function DeleteProductDialog({
  product,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  product: Product | null
  isDeleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (product: Product) => void
}) {
  return (
    <ConfirmDialog
      open={!!product}
      onOpenChange={onOpenChange}
      tone="danger"
      icon={Trash2Icon}
      title={<>Delete product <Name>{product?.name}</Name>?</>}
      description={"If it has orders, it's hidden from the catalog but kept for order history. Otherwise it's removed for good."}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      isPending={isDeleting}
      onConfirm={() => product && onConfirm(product)}
    />
  )
}
