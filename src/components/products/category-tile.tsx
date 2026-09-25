import { createElement } from "react"
import {
  BoxIcon,
  FlagIcon,
  IdCardIcon,
  LayersIcon,
  PrinterIcon,
  ShirtIcon,
  StickerIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

// Ported from dg-prints-online-shop's src/components/category-visual.tsx — keep the two in sync so
// an imageless product looks the same in the portal and the shop.

// Categories are admin-managed free text (and get renamed), so match on keywords, not exact names.
const CATEGORY_ICON_RULES: Array<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /sticker|label|decal/i, icon: StickerIcon },
  { pattern: /tarp|banner|streamer/i, icon: FlagIcon },
  { pattern: /sintra|board|signage|acrylic/i, icon: LayersIcon },
  { pattern: /3d/i, icon: BoxIcon },
  { pattern: /shirt|dtf|apparel|merch|tote/i, icon: ShirtIcon },
  { pattern: /card|id|invitation/i, icon: IdCardIcon },
]

function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICON_RULES.find((rule) => rule.pattern.test(category))?.icon ?? PrinterIcon
}

/** Brand-family gradient pairs — a category always lands on the same one. */
const TILE_GRADIENTS = [
  "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
  "linear-gradient(135deg, oklch(0.55 0.22 262), var(--brand-from))",
  "linear-gradient(135deg, var(--brand-to), oklch(0.6 0.24 322))",
  "linear-gradient(135deg, oklch(0.58 0.16 235), oklch(0.55 0.23 285))",
]

function hash(text: string): number {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

/** Placeholder visual for a product without images: a gradient tile with its category's icon. */
export function CategoryTile({
  category,
  className,
  iconClassName,
}: {
  category: string
  className?: string
  iconClassName?: string
}) {
  return (
    <div
      aria-hidden
      className={cn("relative flex items-center justify-center overflow-hidden text-white", className)}
      style={{ backgroundImage: TILE_GRADIENTS[hash(category) % TILE_GRADIENTS.length] }}
    >
      <div className="absolute -top-1/3 -left-1/4 size-3/4 rounded-full bg-white/20 blur-md" />
      {createElement(categoryIcon(category), {
        className: cn("relative size-5 drop-shadow-sm", iconClassName),
        strokeWidth: 1.75,
      })}
    </div>
  )
}
