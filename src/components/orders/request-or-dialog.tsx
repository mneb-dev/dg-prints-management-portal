import { useEffect, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { Order, OrRequestInput } from "@/lib/orders"
import { requiredMessage } from "@/lib/validation"

/** Collects Official Receipt request details (Name, Address, TIN, Invoice Number) for an order.
 * Reopening on an order that already has `orRequest` on file pre-fills the existing values so
 * staff can correct/update them, matching `record-payment-dialog.tsx`'s reset-on-identity-change
 * pattern. */
export function RequestOrDialog({
  order,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  order: Order | null
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (order: Order, input: OrRequestInput) => void
}) {
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [tin, setTin] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; address?: string }>({})

  useEffect(() => {
    setName(order?.orRequest?.name ?? "")
    setAddress(order?.orRequest?.address ?? "")
    setTin(order?.orRequest?.tin ?? "")
    setInvoiceNumber(order?.orRequest?.invoiceNumber ?? "")
    setFieldErrors({})
  }, [order])

  function handleConfirm(target: Order) {
    const errors: { name?: string; address?: string } = {}
    if (!name.trim()) errors.name = requiredMessage("Name")
    if (!address.trim()) errors.address = requiredMessage("Address")
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    onConfirm(target, {
      name: name.trim(),
      address: address.trim(),
      tin: tin.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
    })
  }

  return (
    <AlertDialog open={!!order} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{order?.orRequest ? "Update OR Request" : "Request OR"}</AlertDialogTitle>
          <AlertDialogDescription>
            Official Receipt details for order{" "}
            <span className="font-medium text-foreground">{order?.orderNumber}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          <Field data-invalid={!!fieldErrors.name}>
            <FieldLabel htmlFor="or-request-name">Name</FieldLabel>
            <Input
              id="or-request-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }))
              }}
              maxLength={120}
              aria-invalid={!!fieldErrors.name}
            />
            <FieldError>{fieldErrors.name}</FieldError>
          </Field>

          <Field data-invalid={!!fieldErrors.address}>
            <FieldLabel htmlFor="or-request-address">Address</FieldLabel>
            <Textarea
              id="or-request-address"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value)
                if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: undefined }))
              }}
              maxLength={250}
              aria-invalid={!!fieldErrors.address}
            />
            <FieldError>{fieldErrors.address}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="or-request-tin">TIN</FieldLabel>
            <Input
              id="or-request-tin"
              value={tin}
              onChange={(event) => setTin(event.target.value)}
              maxLength={20}
              placeholder="Optional"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="or-request-invoice-number">Invoice Number</FieldLabel>
            <Input
              id="or-request-invoice-number"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              maxLength={50}
              placeholder="Optional"
            />
          </Field>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={() => order && handleConfirm(order)}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? "Saving..." : "Save"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
