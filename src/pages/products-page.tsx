import { useState } from "react"
import { PlusIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { DeleteProductDialog } from "@/components/products/delete-product-dialog"
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { ProductTable } from "@/components/products/product-table"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  useProducts,
  type Product,
} from "@/lib/products"

const ANY_CATEGORY = "All Categories"
const ANY_STATUS = "All Statuses"

export function ProductsPage() {
  const { products, deleteProduct, isLoading, isError, error } = useProducts()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState(ANY_CATEGORY)
  const [statusFilter, setStatusFilter] = useState(ANY_STATUS)

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.trim().toLowerCase())
    const matchesCategory =
      categoryFilter === ANY_CATEGORY || product.category === categoryFilter
    const matchesStatus =
      statusFilter === ANY_STATUS || product.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  function handleAdd() {
    setEditingProduct(null)
    setFormOpen(true)
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  async function handleConfirmDelete(product: Product) {
    setIsDeleting(true)
    try {
      await deleteProduct(product.id)
      toast.success("Product deleted.")
      setDeletingProduct(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete product.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Products"
        actions={
          <Button onClick={handleAdd}>
            <PlusIcon data-icon="inline-start" />
            Add Product
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products..."
            className="pl-8"
          />
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(value) => setCategoryFilter(value ?? ANY_CATEGORY)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_CATEGORY}>{ANY_CATEGORY}</SelectItem>
            {PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value ?? ANY_STATUS)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_STATUS}>{ANY_STATUS}</SelectItem>
            {PRODUCT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ProductTable
        products={filteredProducts}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onEdit={handleEdit}
        onDelete={setDeletingProduct}
      />

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />

      <DeleteProductDialog
        product={deletingProduct}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
