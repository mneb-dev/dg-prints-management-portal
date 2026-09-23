import { useEffect } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import { useSalesVisibility } from "@/lib/sales-visibility"
import { cn } from "@/lib/utils"

/** True while the user is typing somewhere, so the Alt+H shortcut never hijacks text entry. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

/** App-wide "hide amounts" switch in the top bar. Visible: a quiet eye icon. Hidden: a labelled
 * "Amounts hidden" pill on the selected-segment accent, so the masked mode is obvious and nobody
 * wonders why figures read ₱••••. Alt+H toggles it from anywhere. Not shown to staff. */
export function SalesVisibilityToggle({ className }: { className?: string }) {
  const { role } = useAuth()
  const { isVisible, toggleVisibility } = useSalesVisibility()
  const isAvailable = role !== "staff"

  useEffect(() => {
    if (!isAvailable) return
    function onKeyDown(event: KeyboardEvent) {
      // event.code, not event.key: on macOS Option+H types "˙".
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.code !== "KeyH") return
      if (isTypingTarget(event.target)) return
      event.preventDefault()
      toggleVisibility()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isAvailable, toggleVisibility])

  if (!isAvailable) return null

  const isHidden = !isVisible
  const Icon = isHidden ? EyeOffIcon : EyeIcon
  const actionLabel = isHidden ? "Show amounts" : "Hide amounts"

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={toggleVisibility}
              aria-pressed={isHidden}
              aria-label={actionLabel}
              className={cn(
                "relative inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-[background-color,color,box-shadow,padding] duration-200 ease-out outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
                isHidden
                  ? "bg-accent px-2 text-accent-foreground ring-1 ring-primary/30 hover:bg-accent/80 sm:px-3"
                  : "w-8 text-muted-foreground hover:bg-muted hover:text-foreground",
                className
              )}
            />
          }
        >
          <Icon
            key={isHidden ? "hidden" : "visible"}
            aria-hidden
            className="size-4 animate-in duration-200 fade-in-0 zoom-in-75 motion-reduce:animate-none"
          />
          {isHidden ? (
            <>
              <span className="hidden animate-in whitespace-nowrap duration-200 fade-in-0 motion-reduce:animate-none sm:inline">
                Amounts hidden
              </span>
              {/* Phones: icon only, with a dot so the masked state still reads at a glance. */}
              <span
                aria-hidden
                className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-2 ring-card sm:hidden"
              />
            </>
          ) : null}
        </TooltipTrigger>
        <TooltipContent className="flex flex-col items-start gap-0.5">
          <span className="flex items-center gap-2 font-medium">
            {actionLabel}
            <kbd className="rounded border border-background/30 px-1 font-sans text-[10px] leading-4 opacity-80">
              Alt+H
            </kbd>
          </span>
          <span className="opacity-80">
            {isHidden ? "Sales figures are masked as ₱••••" : "Masks sales figures on screen"}
          </span>
        </TooltipContent>
      </Tooltip>
      {/* Announces the switch to screen readers; aria-pressed alone isn't read on every change. */}
      <span className="sr-only" aria-live="polite">
        {isHidden ? "Amounts hidden" : "Amounts shown"}
      </span>
    </>
  )
}
