import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { THEME_PREFERENCES, useTheme, type ThemePreference } from "@/lib/theme"
import { cn } from "@/lib/utils"

const THEME_META: Record<ThemePreference, { label: string; icon: typeof SunIcon }> = {
  light: { label: "Light", icon: SunIcon },
  dark: { label: "Dark", icon: MoonIcon },
  system: { label: "System", icon: MonitorIcon },
}

/** Top-bar theme switch: a quiet icon button (same chrome as the hide-amounts eye) that cycles
 * Light → Dark → System. The icon shows the current *preference*; the tooltip spells out what
 * "System" resolved to and what the next click does. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, cycleTheme } = useTheme()
  const current = THEME_META[theme]
  const next = THEME_META[THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(theme) + 1) % THEME_PREFERENCES.length]]
  const Icon = current.icon
  const currentLabel =
    theme === "system" ? `System (${THEME_META[resolvedTheme].label})` : current.label

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`Theme: ${currentLabel}. Switch to ${next.label}`}
              className={cn(
                "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,box-shadow] duration-200 ease-out outline-none select-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
                className
              )}
            />
          }
        >
          <Icon
            key={theme}
            aria-hidden
            className="size-4 animate-in duration-200 fade-in-0 zoom-in-75 motion-reduce:animate-none"
          />
        </TooltipTrigger>
        <TooltipContent className="flex flex-col items-start gap-0.5">
          <span className="font-medium">Theme: {currentLabel}</span>
          <span className="opacity-80">Click for {next.label}</span>
        </TooltipContent>
      </Tooltip>
      <span className="sr-only" aria-live="polite">
        Theme: {currentLabel}
      </span>
    </>
  )
}
