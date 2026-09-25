import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ALL_VARIANTS, type PricingEntry, type Product, type ProductImage } from "@/lib/products"
import { cn, formatCurrency } from "@/lib/utils"

/** "per package" / "per sq.ft." / "" — the unit written the way staff would say it to a customer. */
function unitSuffix(entry: PricingEntry): string {
  if (entry.pricingType === "Fixed") return ""
  if (entry.unit === "Package") return "per package"
  if (entry.unit === "piece") return "per piece"
  return `per ${entry.unit}`
}

/** Plain-language name for a price row: the variant it applies to, then the package name.
 *  e.g. "Glossy · 3 × 3 in", "Standard" when it applies to every variant. */
function priceLabel(entry: PricingEntry, product: Product): string {
  const variant =
    entry.appliesTo === ALL_VARIANTS
      ? []
      : entry.appliesTo.map((condition) => condition.value).filter(Boolean)
  const parts = [...variant, entry.packageName?.trim()].filter(Boolean) as string[]
  if (parts.length > 0) return parts.join(" · ")
  return product.options.length > 0 ? "Any option" : "Standard"
}

/** Main image with a thumbnail strip to flip through the rest. */
function ImageGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [selectedId, setSelectedId] = useState(images[0]?.id)
  const selected = images.find((image) => image.id === selectedId) ?? images[0]
  if (!selected) return null

  return (
    <div className="flex flex-col gap-2">
      <img
        src={selected.url}
        alt={name}
        decoding="async"
        className="aspect-[4/3] w-full rounded-xl border bg-muted object-cover"
      />
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Show image ${index + 1}`}
              aria-pressed={image.id === selected.id}
              onClick={() => setSelectedId(image.id)}
              className={cn(
                "size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                image.id === selected.id ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img src={image.url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Read-only, staff-friendly product card: what it is, what customers can choose, and what it
 * costs — without the admin editor's configuration detail (pricing types, applies-to rules,
 * required flags). */
export function ProductDetailsDialog({
  product,
  onOpenChange,
}: {
  product: Product | null
  onOpenChange: (open: boolean) => void
}) {
  const prices = useMemo(() => {
    if (!product) return []
    return product.pricing
      .filter((entry) => Number.isFinite(entry.price))
      .map((entry) => ({ id: entry.id, label: priceLabel(entry, product), price: entry.price, unit: unitSuffix(entry) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }) || a.price - b.price)
  }, [product])

  const startingPrice = prices.length > 0 ? Math.min(...prices.map((row) => row.price)) : null
  const startingUnit = prices.find((row) => row.price === startingPrice)?.unit ?? ""
  const isActive = product?.status === "Active"

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {product && (
          <>
            <DialogHeader>
              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle className="truncate">{product.name}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <span>{product.category}</span>
                  <Badge variant="secondary" className="gap-1.5">
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0 translate-y-px rounded-full",
                        isActive ? "bg-order-status-teal" : "bg-muted-foreground/40"
                      )}
                    />
                    <span className="leading-none">{isActive ? "Available" : "Not available"}</span>
                  </Badge>
                  {product.showInShop && (
                    <Badge variant="outline">
                      <span className="leading-none">In online shop</span>
                    </Badge>
                  )}
                  {product.madeToOrder && (
                    <Badge variant="outline">
                      <span className="leading-none">Made to order</span>
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-5">
              {product.images.length > 0 && (
                // Keyed so opening another product starts on its main image.
                <ImageGallery key={product.id} images={product.images} name={product.name} />
              )}

              {startingPrice !== null && (
                <div className="flex items-baseline justify-between gap-3 rounded-xl bg-accent/50 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Starts at</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-2xl leading-none font-semibold tabular-nums">
                      {formatCurrency(startingPrice)}
                    </span>
                    {startingUnit && <span className="text-xs text-muted-foreground">{startingUnit}</span>}
                  </span>
                </div>
              )}

              {product.description?.trim() && (
                <p className="text-sm text-pretty text-muted-foreground">{product.description.trim()}</p>
              )}

              {product.options.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Customers choose
                  </h3>
                  <dl className="flex flex-col gap-3">
                    {product.options.map((option) => (
                      <div key={option.id} className="flex flex-col gap-1.5">
                        <dt className="text-sm font-medium">{option.name}</dt>
                        <dd className="flex flex-wrap gap-1.5">
                          {option.values.map((value) => (
                            <Badge key={value} variant="outline" className="font-normal">
                              {value}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Prices</h3>
                {prices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No prices set yet — ask an admin.</p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {prices.map((row) => (
                      <li key={row.id} className="flex items-baseline justify-between gap-4 px-3.5 py-2.5 text-sm">
                        <span className="min-w-0">{row.label}</span>
                        <span className="flex shrink-0 items-baseline gap-1">
                          <span className="font-semibold tabular-nums">{formatCurrency(row.price)}</span>
                          {row.unit && <span className="text-xs text-muted-foreground">{row.unit}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
