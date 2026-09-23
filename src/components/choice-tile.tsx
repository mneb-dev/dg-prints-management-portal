import type { ComponentProps } from "react"
import { CheckIcon } from "lucide-react"

import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

/** Selectable tile for single/multi-choice rows inside a `ToggleGroup` (order channel, payment
 * method, product options). An outline chip that, once picked, takes the soft indigo accent and a
 * leading ✓ — it overrides Toggle's solid-primary pressed fill so a choice reads as "selected",
 * not "shouting", and stays consistent everywhere a user picks one of a few values. */
export function ChoiceTile({ className, children, ...props }: ComponentProps<typeof Toggle>) {
  return (
    <Toggle
      className={cn(
        "group/tile h-8 gap-1.5 px-3",
        "data-[pressed]:border-primary data-[pressed]:bg-accent data-[pressed]:text-accent-foreground data-[pressed]:hover:bg-accent",
        "dark:data-[pressed]:bg-accent",
        className
      )}
      {...props}
    >
      <CheckIcon aria-hidden className="hidden size-3.5 shrink-0 stroke-3 group-data-[pressed]/tile:inline-block" />
      {children}
    </Toggle>
  )
}
