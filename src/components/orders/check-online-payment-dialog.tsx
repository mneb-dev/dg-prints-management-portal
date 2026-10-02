import { useEffect, useState } from "react"
import { ArrowRightIcon, SearchCheckIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { FilterSearchInput } from "@/components/filter-toolbar"
import { FormDialogHeader } from "@/components/form-dialog-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-error"
import { checkShopCheckout, listShopCheckouts, type ShopCheckout } from "@/lib/shop-checkouts"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { cn, formatCurrency, formatDateTime } from "@/lib/utils"

const STATUS: Record<ShopCheckout["status"], { label: string; dot: string }> = {
  paid: { label: "Paid", dot: "bg-order-status-teal" },
  pending: { label: "Awaiting payment", dot: "bg-order-status-gold" },
  expired: { label: "Not paid · expired", dot: "bg-muted-foreground/50" },
}

/**
 * For "I was charged but got no order" claims on online-shop orders. Online orders only exist once
 * PayMongo confirms the payment, so a missed confirmation leaves the buyer's checkout unpaid here.
 * "Check payment" re-asks PayMongo; if the money is there, the server creates the paid order.
 */
export function CheckOnlinePaymentDialog({
  open,
  onOpenChange,
  onOrderCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderCreated: () => void
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim())
  const [checkouts, setCheckouts] = useState<ShopCheckout[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    listShopCheckouts(debouncedSearch)
      .then((items) => !cancelled && setCheckouts(items))
      .catch((error) => !cancelled && setLoadError(getErrorMessage(error)))
      .finally(() => !cancelled && setIsLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, debouncedSearch])

  async function handleCheck(checkout: ShopCheckout) {
    setCheckingId(checkout.id)
    try {
      const updated = await checkShopCheckout(checkout.id)
      setCheckouts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      if (updated.status === "paid") {
        toast.success(`Payment found on PayMongo — order ${updated.orderNumber ?? ""} created as paid.`)
        onOrderCreated()
      } else if (updated.status === "expired") {
        toast.info("PayMongo has no payment for this checkout, and it has expired.")
      } else {
        toast.info("PayMongo has no payment for this checkout yet.")
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setCheckingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <FormDialogHeader
          icon={SearchCheckIcon}
          title={<>Check online payment</>}
          description={
            <>
              Buyer says they paid online but has no order? Find their checkout and check it with PayMongo — if the
              payment is there, the order is created as paid.
            </>
          }
        />

        <FilterSearchInput value={search} onChange={setSearch} placeholder="Buyer name or mobile number" />

        <DialogBody className="min-h-48">
          {isLoading && checkouts.length === 0 ? (
            <div className="flex justify-center py-12">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : loadError ? (
            <p className="py-12 text-center text-sm text-destructive">{loadError}</p>
          ) : checkouts.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {debouncedSearch
                ? "No online checkouts match. If there's none, the buyer never reached our payment page."
                : "No online checkouts yet."}
            </p>
          ) : (
            <ul className={cn("flex flex-col gap-2 pb-1 transition-opacity", isLoading && "opacity-60")}>
              {checkouts.map((checkout) => {
                const status = STATUS[checkout.status]
                return (
                  <li
                    key={checkout.id}
                    className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{checkout.customerName}</span>
                        <span className="text-sm text-muted-foreground tabular-nums">{checkout.customerPhone}</span>
                        <Badge variant="outline" className="gap-1.5">
                          <span aria-hidden className={cn("size-2 rounded-full", status.dot)} />
                          {status.label}
                          {checkout.status === "paid" && checkout.paymentMethod ? ` · ${checkout.paymentMethod}` : ""}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{checkout.items.join(", ")}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground tabular-nums">{formatCurrency(checkout.total)}</span>
                        {" · "}
                        {formatDateTime(checkout.createdAt)}
                      </p>
                    </div>

                    {checkout.status === "paid" && checkout.orderId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          onOpenChange(false)
                          navigate(`/orders/${checkout.orderId}`)
                        }}
                      >
                        {checkout.orderNumber ?? "View order"}
                        <ArrowRightIcon data-icon="inline-end" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="shrink-0"
                        disabled={checkingId !== null}
                        onClick={() => handleCheck(checkout)}
                      >
                        {checkingId === checkout.id ? <Spinner data-icon="inline-start" /> : null}
                        {checkingId === checkout.id ? "Checking…" : "Check payment"}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
