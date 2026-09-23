import type { ReactNode } from "react"

import { CommonSizeList, MAX_COMMON_SIZES } from "@/components/settings/common-size-list"
import { useCategories, useCategoryActions, type Category, type CommonSize } from "@/lib/categories"
import { LENGTH_UNITS } from "@/lib/length-units"
import { STICKER_UNITS } from "@/lib/sticker-quotation"

// Same exact-name lookup pattern already used across the app for category-scoped config
// (see order-status.ts's getStatusFlowForCategory and calculator-page.tsx) — live category
// names in this environment are "Sticker" and "Tarpaulin".
const STICKER_LABEL_NAME = "Sticker"
const TARPAULIN_NAME = "Tarpaulin"

/** Quick-size presets for the Calculator, one panel per configurable category. Rendered inside the
 * Settings page's "Quick sizes" section, which supplies the heading. */
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

  const stickerSizes = stickerLabelCategory?.commonSizes ?? []
  const tarpaulinSizes = tarpaulinCategory?.commonSizes ?? []

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SizePanel
        title={stickerLabelCategory?.name ?? STICKER_LABEL_NAME}
        hint="Also used for Laminated sticker"
        count={stickerSizes.length}
        isLoading={isLoading}
      >
        <CommonSizeList
          sizes={stickerSizes}
          unitOptions={STICKER_UNITS}
          isLoading={isLoading}
          onAdd={addTo(stickerLabelCategory)}
          onDelete={deleteFrom(stickerLabelCategory)}
          defaultUnit={STICKER_UNITS[0]}
        />
      </SizePanel>
      <SizePanel
        title={tarpaulinCategory?.name ?? TARPAULIN_NAME}
        count={tarpaulinSizes.length}
        isLoading={isLoading}
      >
        <CommonSizeList
          sizes={tarpaulinSizes}
          unitOptions={LENGTH_UNITS}
          isLoading={isLoading}
          onAdd={addTo(tarpaulinCategory)}
          onDelete={deleteFrom(tarpaulinCategory)}
          defaultUnit={LENGTH_UNITS[3]}
        />
      </SizePanel>
    </div>
  )
}

function SizePanel({
  title,
  hint,
  count,
  isLoading,
  children,
}: {
  title: string
  hint?: string
  count: number
  isLoading: boolean
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4 className="text-sm font-semibold">{title}</h4>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {!isLoading ? (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {count}/{MAX_COMMON_SIZES}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  )
}
