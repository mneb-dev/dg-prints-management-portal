import { FlameIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { HOT_PRODUCT_TOP_N, useHotProductIds } from "@/lib/orders"
import { useProductCatalog } from "@/lib/products"

const RANK_BADGE_CLASSES = [
  "bg-status-warning text-white",
  "bg-muted-foreground/70 text-white",
  "bg-status-progress/80 text-white",
] as const

// Always featured regardless of order-count ranking; remaining slots still rank by order count.
const PINNED_HOT_PRODUCT_NAMES = ["Sticker Label", "Tarpaulin", "Sintra"]

export function HotProductsCard({ className }: { className?: string }) {
  const { hotProductIds, isLoading: isLoadingRanking } = useHotProductIds()
  const { products, isLoading: isLoadingCatalog } = useProductCatalog()
  const isLoading = isLoadingRanking || isLoadingCatalog

  const catalogById = new Map(products.map((product) => [product.id, product]))
  const pinnedProducts = PINNED_HOT_PRODUCT_NAMES.map((name) =>
    products.find((product) => product.name === name)
  ).filter((product) => product !== undefined)
  const pinnedIds = new Set(pinnedProducts.map((product) => product.id))
  const rankedProducts = hotProductIds
    .filter((id) => !pinnedIds.has(id))
    .map((id) => catalogById.get(id))
    .filter((product) => product !== undefined)
  const hotProducts = [...pinnedProducts, ...rankedProducts].slice(0, HOT_PRODUCT_TOP_N)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Hot products</CardTitle>
        <CardDescription>Featured picks + most ordered (last 100 orders)</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
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
          <ol className="flex flex-col gap-1.5">
            {hotProducts.map((product, index) => (
              <li
                key={product.id}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    RANK_BADGE_CLASSES[index] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
                <Badge variant="outline">{product.category}</Badge>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
