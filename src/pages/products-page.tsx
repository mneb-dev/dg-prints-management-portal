import { useEffect, useState } from "react"
import { PlusIcon, TagIcon } from "lucide-react"
import { toast } from "sonner"

import { ManageCategoriesDialog } from "@/components/categories/manage-categories-dialog"
import { DeleteProductDialog } from "@/components/products/delete-product-dialog"
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { ProductTable } from "@/components/products/product-table"
import { ActiveFilterChips, FilterSearchInput, FilterToolbar, type ActiveFilter } from "@/components/filter-toolbar"
import { PageHeader } from "@/components/page-header"
import { PaginationBar } from "@/components/pagination-bar"
import { SortControl } from "@/components/sort-control"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { useCategories } from "@/lib/categories"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import {
  PRICING_TYPES,
  PRODUCT_STATUSES,
  useProductActions,
  useProducts,
  type Product,
} from "@/lib/products"

const ANY_CATEGORY = "All Categories"
const ANY_STATUS = "All Statuses"
const ANY_PRICING = "All Pricing"

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "name", label: "Name" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
]

export function ProductsPage() {
  const { hasPermission, role } = useAuth()
  const canManage = hasPermission("manage_products")
  const { products, total, params, setParams, refetch, isLoading, isFetching, isError, error } = useProducts()
  const { deleteProduct } = useProductActions()
  const { categories } = useCategories()
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)

  const [formOpen, setFormOpen] = useState(false)
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (debouncedSearch !== params.search) {
      setParams({ search: debouncedSearch, page: 1 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const hasActiveFilters =
    params.search !== "" ||
    params.category !== "" ||
    params.status !== "" ||
    params.pricingType !== "" ||
    params.sortBy !== "created_at" ||
    params.sortDir !== "asc"

  function clearFilters() {
    setSearchInput("")
    setParams({
      search: "",
      category: "",
      status: "",
      pricingType: "",
      sortBy: "created_at",
      sortDir: "asc",
      page: 1,
    })
  }

  const activeFilters: ActiveFilter[] = [
    params.search && {
      key: "search",
      label: `Search: "${params.search}"`,
      onRemove: () => {
        setSearchInput("")
        setParams({ search: "", page: 1 })
      },
    },
    params.category && {
      key: "category",
      label: params.category,
      onRemove: () => setParams({ category: "", page: 1 }),
    },
    params.status && {
      key: "status",
      label: params.status,
      onRemove: () => setParams({ status: "", page: 1 }),
    },
    params.pricingType && {
      key: "pricingType",
      label: params.pricingType,
      onRemove: () => setParams({ pricingType: "", page: 1 }),
    },
  ].filter((filter): filter is ActiveFilter => Boolean(filter))

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
      refetch()
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
          canManage ? (
            <>
              <Button variant="outline" onClick={() => setManageCategoriesOpen(true)}>
                <TagIcon data-icon="inline-start" />
                Manage Categories
              </Button>
              <Button onClick={handleAdd}>
                <PlusIcon data-icon="inline-start" />
                Add Product
              </Button>
            </>
          ) : undefined
        }
      />

      <FilterToolbar>
        <FilterSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search products..."
          disabled={isLoading || isError}
        />

        <Select
          value={params.category || ANY_CATEGORY}
          onValueChange={(value) =>
            setParams({ category: value === ANY_CATEGORY ? "" : (value ?? ""), page: 1 })
          }
          disabled={isLoading || isError}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_CATEGORY}>{ANY_CATEGORY}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={params.status || ANY_STATUS}
          onValueChange={(value) =>
            setParams({ status: value === ANY_STATUS ? "" : (value ?? ""), page: 1 })
          }
          disabled={isLoading || isError}
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

        <Select
          value={params.pricingType || ANY_PRICING}
          onValueChange={(value) =>
            setParams({ pricingType: value === ANY_PRICING ? "" : (value ?? ""), page: 1 })
          }
          disabled={isLoading || isError}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_PRICING}>{ANY_PRICING}</SelectItem>
            {PRICING_TYPES.map((pricingType) => (
              <SelectItem key={pricingType} value={pricingType}>
                {pricingType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SortControl
          value={params.sortBy}
          direction={params.sortDir}
          options={SORT_OPTIONS}
          onChange={(sortBy, sortDir) => setParams({ sortBy, sortDir, page: 1 })}
          disabled={isLoading || isError}
        />

        <ActiveFilterChips
          filters={activeFilters}
          onClearAll={hasActiveFilters ? clearFilters : undefined}
          disabled={isLoading || isError}
        />
      </FilterToolbar>

      <ProductTable
        products={products}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        error={error}
        hasActiveFilters={hasActiveFilters}
        searchTerm={params.search}
        canManage={canManage}
        role={role}
        onClearFilters={clearFilters}
        onCreate={handleAdd}
        onEdit={handleEdit}
        onDelete={setDeletingProduct}
      />

      {total > 0 && (
        <PaginationBar
          page={params.page}
          pageSize={params.pageSize}
          total={total}
          itemLabel="products"
          onPageChange={(page) => setParams({ page })}
          onPageSizeChange={(pageSize) => setParams({ pageSize, page: 1 })}
          disabled={isLoading || isFetching || isError}
        />
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSaved={refetch}
      />

      <ManageCategoriesDialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen} />

      <DeleteProductDialog
        product={deletingProduct}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
