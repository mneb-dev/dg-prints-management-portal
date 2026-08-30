import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { MoonIcon, SunIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <SwitchPrimitive.Root
      checked={isDark}
      onCheckedChange={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "group/theme-toggle relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-transparent p-1 transition-colors duration-300 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-primary data-unchecked:bg-muted",
        className
      )}
    >
      <SwitchPrimitive.Thumb className="relative flex size-6 items-center justify-center rounded-full bg-background shadow-sm ring-0 transition-transform duration-300 ease-out data-checked:translate-x-6 data-unchecked:translate-x-0">
        <SunIcon className="absolute size-3.5 scale-100 rotate-0 text-muted-foreground opacity-100 transition-all duration-300 ease-out group-data-checked/theme-toggle:scale-50 group-data-checked/theme-toggle:rotate-90 group-data-checked/theme-toggle:opacity-0 motion-reduce:transition-none" />
        <MoonIcon className="absolute size-3.5 scale-50 -rotate-90 text-muted-foreground opacity-0 transition-all duration-300 ease-out group-data-checked/theme-toggle:scale-100 group-data-checked/theme-toggle:rotate-0 group-data-checked/theme-toggle:opacity-100 motion-reduce:transition-none" />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}
