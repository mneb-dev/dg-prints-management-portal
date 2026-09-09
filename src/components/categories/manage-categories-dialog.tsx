import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { CategoryFormDialog } from "@/components/categories/category-form-dialog"
import { CategoryTable } from "@/components/categories/category-table"
import { DeleteCategoryDialog } from "@/components/categories/delete-category-dialog"
import { OrderStatusList } from "@/components/categories/order-status-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { useCategories, useCategoryActions, type Category } from "@/lib/categories"
import { useOrderStatuses, useOrderStatusActions } from "@/lib/order-statuses"

export function ManageCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_products")
  const { categories, isLoading, isError, error } = useCategories()
  const { deleteCategory } = useCategoryActions()
  const { statuses, isLoading: isLoadingStatuses } = useOrderStatuses()
  const { addStatus, updateStatus, deleteStatus, reorderStatuses } = useOrderStatusActions()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleAdd() {
    setEditingCategory(null)
    setFormOpen(true)
  }

  function handleEdit(category: Category) {
    setEditingCategory(category)
    setFormOpen(true)
  }

  async function handleConfirmDelete(category: Category) {
    setIsDeleting(true)
    try {
      await deleteCategory(category.id)
      toast.success("Category deleted.")
      setDeletingCategory(null)
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete category.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Add, edit, or deactivate product categories and the order statuses they use.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="order-statuses">Order Statuses</TabsTrigger>
            <TabsIndicator />
          </TabsList>

          <TabsContent value="categories" className="flex flex-col gap-4">
            {canManage && (
              <div className="flex justify-end">
                <Button onClick={handleAdd}>
                  <PlusIcon data-icon="inline-start" />
                  Add Category
                </Button>
              </div>
            )}

            <CategoryTable
              categories={categories}
              isLoading={isLoading}
              isError={isError}
              error={error}
              canManage={canManage}
              onCreate={handleAdd}
              onEdit={handleEdit}
              onDelete={setDeletingCategory}
            />
          </TabsContent>

          <TabsContent value="order-statuses" className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Add, rename, re-icon, reorder, or delete order statuses. Built-in statuses can't be
              renamed or deleted. Changes reflect everywhere statuses are shown — the dashboard,
              orders list, and status menus.
            </p>
            <OrderStatusList
              statuses={statuses}
              isLoading={isLoadingStatuses}
              onAdd={addStatus}
              onUpdate={updateStatus}
              onDelete={deleteStatus}
              onReorder={reorderStatuses}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editingCategory} />

      <DeleteCategoryDialog
        category={deletingCategory}
        isDeleting={isDeleting}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        onConfirm={handleConfirmDelete}
      />
    </Dialog>
  )
}
