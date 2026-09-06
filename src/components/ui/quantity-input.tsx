import * as React from "react"
import { MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function QuantityInput({
  value,
  onChange,
  min = 1,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string
  onChange: (value: string) => void
  min?: number
}) {
  function step(delta: number) {
    const next = Math.max(min, (Number(value) || 0) + delta)
    onChange(String(next))
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label="Decrease quantity"
        onClick={() => step(-1)}
      >
        <MinusIcon />
      </Button>
      <Input
        type="number"
        min={min}
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn("text-center", className)}
        {...props}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label="Increase quantity"
        onClick={() => step(1)}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

export { QuantityInput }
