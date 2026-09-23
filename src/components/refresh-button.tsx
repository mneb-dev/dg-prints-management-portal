import { useEffect, useRef, useState } from "react"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const COOLDOWN_MS = 5000

export function RefreshButton({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void
  isRefreshing: boolean
}) {
  const [isCoolingDown, setIsCoolingDown] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function handleClick() {
    onRefresh()
    setIsCoolingDown(true)
    timeoutRef.current = setTimeout(() => setIsCoolingDown(false), COOLDOWN_MS)
  }

  const label = isRefreshing ? "Refreshing…" : isCoolingDown ? "Refreshed" : "Refresh"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClick}
            disabled={isCoolingDown}
            aria-label={label}
            className="group/refresh"
          />
        }
      >
        <RefreshCwIcon
          className={cn(
            "transition-transform duration-500 ease-out",
            isRefreshing
              ? "animate-spin"
              : "group-hover/refresh:rotate-180 group-hover/refresh:text-primary"
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
