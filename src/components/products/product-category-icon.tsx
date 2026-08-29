import {
  BoxIcon,
  FlagIcon,
  LayoutPanelLeftIcon,
  PackageIcon,
  StickerIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ProductCategory } from "@/lib/products"

const CATEGORY_ICONS: Record<ProductCategory, LucideIcon> = {
  "Sticker Label": StickerIcon,
  Tarpaulin: FlagIcon,
  "Sintra Board": LayoutPanelLeftIcon,
  "General Merchandise": PackageIcon,
  "3D Print": BoxIcon,
}

const CATEGORY_TONES: Record<ProductCategory, string> = {
  "Sticker Label": "bg-status-progress/10 text-status-progress",
  Tarpaulin: "bg-status-info/10 text-status-info",
  "Sintra Board": "bg-status-ready/10 text-status-ready",
  "General Merchandise": "bg-muted text-muted-foreground",
  "3D Print": "bg-primary/10 text-primary",
}

export function ProductCategoryIcon({ category }: { category: ProductCategory }) {
  const Icon = CATEGORY_ICONS[category]
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        CATEGORY_TONES[category]
      )}
    >
      <Icon className="size-4" />
    </div>
  )
}
