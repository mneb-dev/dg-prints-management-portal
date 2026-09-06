import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function CurrencyInput({
  className,
  wrapperClassName,
  type = "number",
  min = 0,
  step = "0.01",
  ...props
}: React.ComponentProps<typeof Input> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
        ₱
      </span>
      <Input type={type} min={min} step={step} className={cn("pl-6", className)} {...props} />
    </div>
  )
}

export { CurrencyInput }
