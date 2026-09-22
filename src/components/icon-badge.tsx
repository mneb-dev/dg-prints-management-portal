import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const SIZE_CLASSNAMES = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-10 [&_svg]:size-5",
  lg: "size-14 [&_svg]:size-6",
} as const

export function IconBadge({
  icon: Icon,
  size = "md",
  className,
}: {
  icon: LucideIcon
  size?: keyof typeof SIZE_CLASSNAMES
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground",
        SIZE_CLASSNAMES[size],
        className
      )}
    >
      <Icon />
    </div>
  )
}
