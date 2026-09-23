import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { PERIOD_PRESET_LABELS, type PeriodPreset } from "@/lib/finance-period"
import { cn } from "@/lib/utils"

// Compact segment labels for phones; the full label shows from `sm` up, on hover, and to screen readers.
const PRESET_SHORT_LABELS: Record<PeriodPreset, string> = {
  this_week: "Week",
  this_month: "Month",
  last_3_months: "3 mo",
  last_6_months: "6 mo",
  this_year: "Year",
  custom: "Custom",
}

/** One-click period switcher (This week · This month · … · Custom) on the shared segmented track.
 * Scrolls sideways on narrow screens instead of wrapping. Used by Finance and Incentives. */
export function PeriodTrack({
  presets,
  value,
  onChange,
  className,
}: {
  presets: readonly PeriodPreset[]
  value: PeriodPreset
  onChange: (preset: PeriodPreset) => void
  className?: string
}) {
  return (
    <div className={cn("max-w-full overflow-x-auto", className)}>
      <ToggleGroup
        aria-label="Period"
        value={[value]}
        onValueChange={(next) => {
          const preset = next[0] as PeriodPreset | undefined
          if (preset) onChange(preset)
        }}
        className={cn(SEGMENT_TRACK_CLASS, "w-fit")}
      >
        {presets.map((preset) => (
          <Toggle
            key={preset}
            value={preset}
            aria-label={PERIOD_PRESET_LABELS[preset]}
            title={PERIOD_PRESET_LABELS[preset]}
            className={SEGMENT_CLASS}
          >
            <span className="sm:hidden">{PRESET_SHORT_LABELS[preset]}</span>
            <span className="hidden sm:inline">{PERIOD_PRESET_LABELS[preset]}</span>
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  )
}
