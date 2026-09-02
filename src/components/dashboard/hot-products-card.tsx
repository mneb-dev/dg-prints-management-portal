import { FlameIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useHotProductIds } from "@/lib/orders"
import { useProductCatalog } from "@/lib/products"

export function HotProductsCard() {
  const { hotProductIds, isLoading: isLoadingRanking } = useHotProductIds()
  const { products, isLoading: isLoadingCatalog } = useProductCatalog()
  const isLoading = isLoadingRanking || isLoadingCatalog

  const catalogById = new Map(products.map((product) => [product.id, product]))
  const hotProducts = hotProductIds
    .map((id) => catalogById.get(id))
    .filter((product) => product !== undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hot products</CardTitle>
        <CardDescription>Most ordered — last 100 orders</CardDescription>
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
          <ol className="flex flex-col gap-2">
            {hotProducts.map((product, index) => (
              <li key={product.id} className="flex items-center gap-3 text-sm">
                <span className="w-4 shrink-0 text-muted-foreground tabular-nums">{index + 1}</span>
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
