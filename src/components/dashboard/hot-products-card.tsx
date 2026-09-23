import { useMemo } from "react"
import { FlameIcon, PinIcon } from "lucide-react"

import { IconBadge } from "@/components/icon-badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RANK_BADGE_CLASSES } from "@/lib/rank-badge"
import { cn } from "@/lib/utils"
import { HOT_PRODUCT_MIN_ORDER_COUNT, HOT_PRODUCT_TOP_N, useRecentOrders } from "@/lib/orders"
import { useProductCatalog } from "@/lib/products"

// Always listed regardless of order count — but ranked by their real count like everything
// else (marked "Featured"), so they never take a medal they didn't earn.
const PINNED_HOT_PRODUCT_NAMES = ["Sticker Label", "Tarpaulin", "Sintra"]

export function HotProductsCard({ className }: { className?: string }) {
  // The same once-per-session last-100-orders sample `computeHotProductIds` ranks from — counted
  // here so the card can show *how* hot each product is, with no extra request.
  const { recentOrders, isLoading: isLoadingOrders } = useRecentOrders()
  const { products, isLoading: isLoadingCatalog } = useProductCatalog()
  const isLoading = isLoadingOrders || isLoadingCatalog

  const hotProducts = useMemo(() => {
    // Breadth of demand: +1 per order containing the product, not summed quantity (matches
    // computeHotProductIds, so one bulk order doesn't outrank repeat-ordered products).
    const countByProductId = new Map<string, number>()
    for (const order of recentOrders) {
      for (const productId of new Set(order.items.map((item) => item.productId).filter(Boolean))) {
        countByProductId.set(productId, (countByProductId.get(productId) ?? 0) + 1)
      }
    }

    const withCount = (product: (typeof products)[number], isPinned: boolean) => ({
      product,
      isPinned,
      count: countByProductId.get(product.id) ?? 0,
    })

    const pinned = PINNED_HOT_PRODUCT_NAMES.map((name) => products.find((product) => product.name === name))
      .filter((product) => product !== undefined)
      .map((product) => withCount(product, true))
    const pinnedIds = new Set(pinned.map((entry) => entry.product.id))
    const ranked = products
      .filter((product) => !pinnedIds.has(product.id))
      .map((product) => withCount(product, false))
      .filter((entry) => entry.count >= HOT_PRODUCT_MIN_ORDER_COUNT)
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.max(0, HOT_PRODUCT_TOP_N - pinned.length))

    return [...pinned, ...ranked].sort(
      (a, b) =>
        b.count - a.count ||
        Number(b.isPinned) - Number(a.isPinned) ||
        a.product.name.localeCompare(b.product.name)
    )
  }, [recentOrders, products])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconBadge icon={FlameIcon} size="sm" />
          <div className="min-w-0">
            <CardTitle>Hot products</CardTitle>
            <CardDescription>Ranked by how many orders include them</CardDescription>
          </div>
        </div>
        <CardAction className="text-xs text-muted-foreground">Last 100 orders</CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: HOT_PRODUCT_TOP_N }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b py-3 last:border-b-0">
                <Skeleton className="size-6 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : hotProducts.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <FlameIcon />
            </EmptyMedia>
            <EmptyTitle>Not enough data yet</EmptyTitle>
            <EmptyDescription>Hot products appear once order volume picks up.</EmptyDescription>
          </Empty>
        ) : (
          // One shared grid (rank · product · count); each row is a two-line subgrid. Rows are
          // deliberately not interactive — the Orders list can't filter by product.
          <ol className="-mx-2 grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-x-3">
            {hotProducts.map(({ product, isPinned, count }, index) => {
              const rank = index + 1
              const hasMedal = index < RANK_BADGE_CLASSES.length && count > 0
              return (
                <li
                  key={product.id}
                  className="col-span-full grid grid-cols-subgrid grid-rows-[auto_auto] items-center gap-y-1.5 border-b px-2 py-2.5 text-sm last:border-b-0"
                >
                  {hasMedal ? (
                    <span
                      className={cn(
                        "row-span-2 flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                        RANK_BADGE_CLASSES[index]
                      )}
                    >
                      {rank}
                    </span>
                  ) : (
                    <span className="row-span-2 text-center text-xs text-muted-foreground tabular-nums">
                      {rank}
                    </span>
                  )}
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span title={product.name} className="truncate leading-tight font-medium">
                      {product.name}
                    </span>
                    {isPinned ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={<span />}
                          className="inline-flex shrink-0 cursor-default text-primary"
                        >
                          <PinIcon aria-hidden className="size-3" />
                          <span className="sr-only">Featured</span>
                        </TooltipTrigger>
                        <TooltipContent>Featured — always shown</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </span>
                  <span className="flex items-baseline justify-end gap-1 leading-tight">
                    <span className={cn("font-semibold tabular-nums", count === 0 && "text-muted-foreground")}>
                      {count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">{count === 1 ? "order" : "orders"}</span>
                  </span>
                  {/* Line 2: category under the name. */}
                  <span className="col-start-2 truncate text-xs leading-none text-muted-foreground">
                    {product.category}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
