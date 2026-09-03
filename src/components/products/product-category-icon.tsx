import {
  BoxIcon,
  FlagIcon,
  LayersIcon,
  LayoutPanelLeftIcon,
  PackageIcon,
  StickerIcon,
  TagIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ProductCategory } from "@/lib/products"

const DEFAULT_CATEGORY_ICON: LucideIcon = TagIcon
const DEFAULT_CATEGORY_TONE = "bg-muted text-muted-foreground"

const CATEGORY_ICONS: Partial<Record<string, LucideIcon>> = {
  "Sticker Label": StickerIcon,
  "Laminated Sticker": LayersIcon,
  Tarpaulin: FlagIcon,
  "Sintra Board": LayoutPanelLeftIcon,
  "General Merchandise": PackageIcon,
  "3D Print": BoxIcon,
}

const CATEGORY_TONES: Partial<Record<string, string>> = {
  "Sticker Label": "bg-status-progress/10 text-status-progress",
  "Laminated Sticker": "bg-status-warning/10 text-status-warning",
  Tarpaulin: "bg-status-info/10 text-status-info",
  "Sintra Board": "bg-status-ready/10 text-status-ready",
  "General Merchandise": "bg-muted text-muted-foreground",
  "3D Print": "bg-primary/10 text-primary",
}

export function ProductCategoryIcon({ category }: { category: ProductCategory }) {
  const Icon = CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        CATEGORY_TONES[category] ?? DEFAULT_CATEGORY_TONE
      )}
    >
      <Icon className="size-4" />
    </div>
  )
}
