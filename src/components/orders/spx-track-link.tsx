import { CopyIcon, ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { copyToClipboard } from "@/lib/clipboard"
import { spxTrackingUrl } from "@/lib/spx-tracking"
import { cn } from "@/lib/utils"

/**
 * SPX tracking for an order, with "open" and "copy link" icon buttons. SPX's tracking page finds the parcel by
 * its Customer Reference No. (our order number); only parcels booked through Export to SPX carry it.
 */
export function SpxTrackLink({ orderNumber, className }: { orderNumber: string; className?: string }) {
  const url = spxTrackingUrl(orderNumber)
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className="truncate">{orderNumber}</span>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Open SPX tracking for ${orderNumber}`}
              render={<a href={url} target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
            />
          }
        >
          <ExternalLinkIcon />
        </TooltipTrigger>
        <TooltipContent>Open in SPX</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Copy SPX tracking link for ${orderNumber}`}
              onClick={() => void copyToClipboard(url)}
            />
          }
        >
          <CopyIcon />
        </TooltipTrigger>
        <TooltipContent>Copy tracking link</TooltipContent>
      </Tooltip>
    </span>
  )
}
