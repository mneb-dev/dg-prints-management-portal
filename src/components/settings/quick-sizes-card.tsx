import { RulerIcon } from "lucide-react"

import { CommonSizeList } from "@/components/settings/common-size-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCategories, useCategoryActions, type Category, type CommonSize } from "@/lib/categories"
import { LENGTH_UNITS } from "@/lib/length-units"
import { STICKER_UNITS } from "@/lib/sticker-quotation"

// Same exact-name lookup pattern already used across the app for category-scoped config
// (see order-status.ts's getStatusFlowForCategory and calculator-page.tsx) — live category
// names in this environment are "Sticker" and "Tarpaulin".
const STICKER_LABEL_NAME = "Sticker"
const TARPAULIN_NAME = "Tarpaulin"

export function QuickSizesCard() {
  const { categories, isLoading } = useCategories()
  const { updateCategory } = useCategoryActions()

  const stickerLabelCategory = categories.find((c) => c.name === STICKER_LABEL_NAME) ?? null
  const tarpaulinCategory = categories.find((c) => c.name === TARPAULIN_NAME) ?? null

  async function saveCommonSizes(category: Category, next: CommonSize[]) {
    await updateCategory(category.id, {
      name: category.name,
      active: category.active,
      statusFlow: category.statusFlow,
      commonSizes: next,
    })
  }

  function addTo(category: Category | null) {
    return async (size: CommonSize) => {
      if (!category) return
      await saveCommonSizes(category, [...category.commonSizes, size])
    }
  }

  function deleteFrom(category: Category | null) {
    return async (index: number) => {
      if (!category) return
      await saveCommonSizes(
        category,
        category.commonSizes.filter((_, i) => i !== index)
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RulerIcon className="size-4 text-muted-foreground" />
          Quick Sizes
        </CardTitle>
        <CardDescription>
          Preset sizes staff can quick-select on the Calculator page.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">
            {stickerLabelCategory?.name ?? STICKER_LABEL_NAME}
            <span className="ml-1 font-normal text-muted-foreground">(also used for Laminated Sticker)</span>
          </span>
          <CommonSizeList
            sizes={stickerLabelCategory?.commonSizes ?? []}
            unitOptions={STICKER_UNITS}
            isLoading={isLoading}
            onAdd={addTo(stickerLabelCategory)}
            onDelete={deleteFrom(stickerLabelCategory)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">{tarpaulinCategory?.name ?? TARPAULIN_NAME}</span>
          <CommonSizeList
            sizes={tarpaulinCategory?.commonSizes ?? []}
            unitOptions={LENGTH_UNITS}
            isLoading={isLoading}
            onAdd={addTo(tarpaulinCategory)}
            onDelete={deleteFrom(tarpaulinCategory)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
