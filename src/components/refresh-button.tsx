import { useEffect, useRef, useState } from "react"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
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

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      disabled={isCoolingDown}
      aria-label="Refresh"
    >
      <RefreshCwIcon className={cn(isRefreshing && "animate-spin")} />
    </Button>
  )
}
