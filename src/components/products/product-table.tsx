import { Loader2Icon, PackageSearchIcon, PencilIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { summarizePricing, type Product } from "@/lib/products"

export function ProductTable({
  products,
  isLoading,
  isError,
  error,
  onEdit,
  onDelete,
}: {
  products: Product[]
  isLoading?: boolean
  isError?: boolean
  error?: string | null
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}) {
  if (isLoading) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Loader2Icon className="animate-spin" />
          </EmptyMedia>
          <EmptyTitle>Loading products…</EmptyTitle>
          <EmptyDescription>Fetching your product catalog.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (isError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Couldn't load products</EmptyTitle>
          <EmptyDescription>{error ?? "Something went wrong."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (products.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageSearchIcon />
          </EmptyMedia>
          <EmptyTitle>No products found</EmptyTitle>
          <EmptyDescription>
            Try adjusting your search or filters, or add a new product.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Pricing</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {product.category}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {summarizePricing(product.pricing)}
              </TableCell>
              <TableCell>
                <Badge variant={product.status === "Active" ? "default" : "secondary"}>
                  {product.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(product)}
                  >
                    <PencilIcon />
                    <span className="sr-only">Edit {product.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(product)}
                  >
                    <Trash2Icon />
                    <span className="sr-only">Delete {product.name}</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
