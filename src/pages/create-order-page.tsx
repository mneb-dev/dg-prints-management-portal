import { FileTextIcon } from "lucide-react"
import { useState } from "react"
import { useLocation } from "react-router-dom"

import { OrderDraftsDialog } from "@/components/orders/order-drafts-dialog"
import { OrderForm, type OrderFormSeed } from "@/components/orders/order-form"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { type OrderDraft, useOrderDrafts } from "@/lib/order-drafts"

export function CreateOrderPage() {
  const location = useLocation()
  const { drafts, deleteDraft } = useOrderDrafts()
  const [draftToLoad, setDraftToLoad] = useState<OrderDraft | null>(null)
  const [draftsDialogOpen, setDraftsDialogOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New Order"
        description="Fill in the customer, items and payment — the summary updates as you go."
        actions={
          <Button type="button" variant="outline" onClick={() => setDraftsDialogOpen(true)}>
            <FileTextIcon data-icon="inline-start" />
            Drafts
            {drafts.length > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground tabular-nums">
                {drafts.length}
              </span>
            )}
          </Button>
        }
      />
      <OrderDraftsDialog
        open={draftsDialogOpen}
        onOpenChange={setDraftsDialogOpen}
        drafts={drafts}
        onLoad={(draft) => {
          setDraftToLoad(draft)
          setDraftsDialogOpen(false)
        }}
        onDelete={deleteDraft}
      />
      <OrderForm
        order={null}
        initialValues={location.state as OrderFormSeed | undefined}
        draftToLoad={draftToLoad}
      />
    </div>
  )
}
