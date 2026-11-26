import { CopyIcon, ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { copyToClipboard } from "@/lib/clipboard"
import { spxTrackingUrl } from "@/lib/spx-tracking"
import { cn } from "@/lib/utils"

/** An SPX tracking number that opens SPX's tracking page, with an optional copy button. */
export function TrackingNumber({
  value,
  copyable = false,
  className,
}: {
  value: string
  copyable?: boolean
  className?: string
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <a
        href={spxTrackingUrl(value)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-w-0 items-center gap-1 font-mono tabular-nums hover:underline"
        onClick={(event) => event.stopPropagation()}
        title="Track in SPX"
      >
        <span className="truncate">{value}</span>
        <ExternalLinkIcon aria-hidden className="size-3 shrink-0 text-muted-foreground" />
      </a>
      {copyable && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Copy tracking number"
                onClick={(event) => {
                  event.stopPropagation()
                  void copyToClipboard(value)
                }}
              />
            }
          >
            <CopyIcon />
          </TooltipTrigger>
          <TooltipContent>Copy tracking no.</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
