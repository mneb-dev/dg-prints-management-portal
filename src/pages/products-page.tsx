import { useEffect, useState } from "react"
import { ArrowUpDownIcon, PlusIcon, TagIcon } from "lucide-react"
import { toast } from "sonner"

import { ManageCategoriesDialog } from "@/components/categories/manage-categories-dialog"
import { DeleteProductDialog } from "@/components/products/delete-product-dialog"
import { ProductDetailsDialog } from "@/components/products/product-details-dialog"
import { ProductFormDialog } from "@/components/products/product-form-dialog"
import { ProductTable } from "@/components/products/product-table"
import {
  ACTIVE_FILTER_TRIGGER_CLASS,
  ActiveFilterChips,
  FilterSearchInput,
  FilterToolbar,
  type ActiveFilter,
} from "@/components/filter-toolbar"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
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
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { useAuth } from "@/lib/auth"
import { useCategories } from "@/lib/categories"
import { useClampPage } from "@/lib/pagination"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { cn } from "@/lib/utils"
import {
  PRICING_TYPES,
  PRODUCT_STATUSES,
  useProductActions,
  useProducts,
  type Product,
} from "@/lib/products"

const ANY_CATEGORY = "All Categories"
const ALL_STATUS = "all"
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
  useClampPage(params.page, params.pageSize, total, isFetching, (page) => setParams({ page }))
  const { deleteProduct } = useProductActions()
  const { categories } = useCategories()
  const [searchInput, setSearchInput] = useState(params.search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)

  const [formOpen, setFormOpen] = useState(false)
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  // Staff/viewers get a simple read-only product card instead of the editor.
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
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
      label: `Category: ${params.category}`,
      onRemove: () => setParams({ category: "", page: 1 }),
    },
    params.status && {
      key: "status",
      label: `Status: ${params.status}`,
      onRemove: () => setParams({ status: "", page: 1 }),
    },
    params.pricingType && {
      key: "pricingType",
      label: `Pricing: ${params.pricingType}`,
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
        description={isLoading ? "Your catalog and pricing" : `${total.toLocaleString()} ${total === 1 ? "product" : "products"}`}
        actions={
          canManage ? (
            <>
              <Button variant="outline" onClick={() => setManageCategoriesOpen(true)}>
                <TagIcon data-icon="inline-start" />
                Manage categories
              </Button>
              <Button onClick={handleAdd}>
                <PlusIcon data-icon="inline-start" />
                Add product
              </Button>
            </>
          ) : undefined
        }
      />

      <FilterToolbar className="gap-2">
        <FilterSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search products..."
          disabled={isLoading || isError}
          className="min-w-56"
        />

        {/* Only three values, so one click beats a dropdown — same joined track as the order
            form's payment status, with the status dots. */}
        <ToggleGroup
          aria-label="Filter by status"
          value={[params.status || ALL_STATUS]}
          onValueChange={(next) => {
            const value = next[0]
            if (value) setParams({ status: value === ALL_STATUS ? "" : value, page: 1 })
          }}
          disabled={isLoading || isError}
          className={SEGMENT_TRACK_CLASS}
        >
          <Toggle value={ALL_STATUS} className={SEGMENT_CLASS}>
            All
          </Toggle>
          {PRODUCT_STATUSES.map((status) => (
            <Toggle key={status} value={status} className={SEGMENT_CLASS}>
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 translate-y-px rounded-full",
                  status === "Active" ? "bg-order-status-teal" : "bg-muted-foreground/40"
                )}
              />
              <span className="leading-none">{status}</span>
            </Toggle>
          ))}
        </ToggleGroup>

        <Select
          value={params.category || ANY_CATEGORY}
          onValueChange={(value) =>
            setParams({ category: value === ANY_CATEGORY ? "" : (value ?? ""), page: 1 })
          }
          disabled={isLoading || isError}
        >
          <SelectTrigger
            aria-label="Filter by category"
            className={cn("min-w-40", params.category && ACTIVE_FILTER_TRIGGER_CLASS)}
          >
            <SelectValue>
              {(value: string | null) =>
                value && value !== ANY_CATEGORY ? (
                  <span className="truncate">{value}</span>
                ) : (
                  "All categories"
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_CATEGORY}>All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
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
          <SelectTrigger
            aria-label="Filter by pricing type"
            className={cn("min-w-36", params.pricingType && ACTIVE_FILTER_TRIGGER_CLASS)}
          >
            <SelectValue>
              {(value: string | null) => (value && value !== ANY_PRICING ? value : "All pricing")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_PRICING}>All pricing</SelectItem>
            {PRICING_TYPES.map((pricingType) => (
              <SelectItem key={pricingType} value={pricingType}>
                {pricingType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5" title="Sort">
          <ArrowUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <SortControl
            value={params.sortBy}
            direction={params.sortDir}
            options={SORT_OPTIONS}
            onChange={(sortBy, sortDir) => setParams({ sortBy, sortDir, page: 1 })}
            disabled={isLoading || isError}
            className="min-w-44"
          />
        </div>

        <ActiveFilterChips
          filters={activeFilters}
          onClearAll={hasActiveFilters ? clearFilters : undefined}
          disabled={isLoading || isError}
          label="Active filters:"
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
        onView={setViewingProduct}
        onDelete={setDeletingProduct}
        footer={
          total > 0 && (
            <PaginationBar
              page={params.page}
              pageSize={params.pageSize}
              total={total}
              itemLabel="products"
              onPageChange={(page) => setParams({ page })}
              onPageSizeChange={(pageSize) => setParams({ pageSize, page: 1 })}
              disabled={isLoading || isFetching || isError}
            />
          )
        }
      />

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSaved={refetch}
      />

      <ProductDetailsDialog
        product={viewingProduct}
        onOpenChange={(open) => !open && setViewingProduct(null)}
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
