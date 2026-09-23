import { useState } from "react"
import { PlusIcon, TagsIcon } from "lucide-react"
import { toast } from "sonner"

import { CategoryFormDialog } from "@/components/categories/category-form-dialog"
import { CategoryTable } from "@/components/categories/category-table"
import { DeleteCategoryDialog } from "@/components/categories/delete-category-dialog"
import { OrderStatusList } from "@/components/categories/order-status-list"
import { FormDialogHeader } from "@/components/form-dialog-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import { useCategories, useCategoryActions, type Category } from "@/lib/categories"
import { useOrderStatuses, useOrderStatusActions } from "@/lib/order-statuses"

const TAB_CLASS =
  "h-7 gap-1.5 rounded-md px-3 hover:text-foreground data-[active]:font-semibold data-[active]:text-accent-foreground"

function TabCount({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-background/70 px-1.5 text-[0.65rem] leading-4 font-semibold text-muted-foreground tabular-nums">
      {value}
    </span>
  )
}

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
      <DialogContent className="sm:max-w-3xl">
        <FormDialogHeader
          icon={TagsIcon}
          title={<>Manage categories</>}
          description={<>Add, edit, or deactivate product categories and the order statuses they use.</>}
        />

        {/* Only the tab content scrolls; the header stays in view. */}
        <DialogBody>
        <Tabs defaultValue="categories">
          {/* Segmented tabs (same track as the app's other one-click switchers); the indicator is
              the raised pill that slides between them. */}
          <TabsList className="w-fit gap-0.5 rounded-lg border border-input bg-muted/60 p-0.5">
            <TabsTrigger value="categories" className={TAB_CLASS}>
              Categories
              <TabCount value={categories.length} />
            </TabsTrigger>
            <TabsTrigger value="order-statuses" className={TAB_CLASS}>
              Order statuses
              <TabCount value={statuses.length} />
            </TabsTrigger>
            <TabsIndicator className="top-0.5 bottom-0.5 z-0 h-auto rounded-md bg-accent shadow-sm ring-1 ring-primary/40" />
          </TabsList>

          <TabsContent
            value="categories"
            className="flex animate-in flex-col gap-3 duration-200 fade-in-0 motion-reduce:animate-none"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Group products and set each group's order flow.</p>
              {canManage && (
                <Button size="sm" onClick={handleAdd}>
                  <PlusIcon data-icon="inline-start" />
                  Add category
                </Button>
              )}
            </div>

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

          <TabsContent
            value="order-statuses"
            className="flex animate-in flex-col gap-3 duration-200 fade-in-0 motion-reduce:animate-none"
          >
            <p className="text-sm text-muted-foreground">
              Drag to reorder. Built-in statuses can be renamed but not deleted. Changes show everywhere
              statuses appear.
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
        </DialogBody>
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
