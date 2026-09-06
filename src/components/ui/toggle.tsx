import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"

import { cn } from "@/lib/utils"

function Toggle({ className, ...props }: TogglePrimitive.Props<string>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-input bg-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none select-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[pressed]:border-primary data-[pressed]:bg-primary data-[pressed]:text-primary-foreground data-[pressed]:hover:bg-primary/90 dark:bg-input/30 dark:hover:bg-input/50 dark:data-[pressed]:bg-primary",
        className
      )}
      {...props}
    />
  )
}

export { Toggle }
