import { DateRangeFilter } from "@/components/date-range-filter"
import { PeriodTrack } from "@/components/period-track"
import { SEGMENT_CLASS, SEGMENT_TRACK_CLASS } from "@/components/segmented"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup } from "@/components/ui/toggle-group"
import type { CommissionReleaseFilter } from "@/lib/commission"
import type { PeriodPreset } from "@/lib/finance-period"
import { cn } from "@/lib/utils"
import type { UserOption } from "@/lib/users"

export type { CommissionReleaseFilter }

const RELEASE_FILTER_LABELS: Record<CommissionReleaseFilter, string> = {
  all: "All",
  released: "Released",
  unreleased: "Unreleased",
}

/** Period · staff · release filters for the Layout commission tab, as one toolbar row of one-click
 * switchers (same tracks as Finance and the Orders filters). */
export function CommissionFilterBar({
  presets,
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomRangeChange,
  staffOptions,
  selectedStaffId,
  onSelectedStaffIdChange,
  releaseFilter,
  onReleaseFilterChange,
}: {
  presets: PeriodPreset[]
  preset: PeriodPreset
  onPresetChange: (preset: PeriodPreset) => void
  customFrom: string
  customTo: string
  onCustomRangeChange: (from: string, to: string) => void
  /** Omit for the staff view — the server always scopes staff to their own commission. */
  staffOptions?: UserOption[]
  selectedStaffId?: string
  onSelectedStaffIdChange?: (id: string) => void
  releaseFilter: CommissionReleaseFilter
  onReleaseFilterChange: (value: CommissionReleaseFilter) => void
}) {
  const selectedStaff = staffOptions?.find((option) => option.id === selectedStaffId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodTrack presets={presets} value={preset} onChange={onPresetChange} />

        {staffOptions && onSelectedStaffIdChange ? (
          <Select
            value={selectedStaffId || "all"}
            onValueChange={(value) => value && onSelectedStaffIdChange(value === "all" ? "" : value)}
          >
            <SelectTrigger aria-label="Filter by staff" className="shrink-0 sm:min-w-44">
              <SelectValue>
                {() => (
                  <span className="truncate">
                    <span className="text-muted-foreground">Staff:</span>{" "}
                    {selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : "All"}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-56" alignItemWithTrigger={false}>
              <SelectItem value="all">All staff</SelectItem>
              {staffOptions.map((option) => (
                <SelectItem key={option.id} value={option.id} className="whitespace-nowrap">
                  {option.firstName} {option.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <ToggleGroup
          aria-label="Release status"
          value={[releaseFilter]}
          onValueChange={(next) => {
            const value = next[0] as CommissionReleaseFilter | undefined
            if (value) onReleaseFilterChange(value)
          }}
          className={cn(SEGMENT_TRACK_CLASS, "w-fit")}
        >
          {(Object.keys(RELEASE_FILTER_LABELS) as CommissionReleaseFilter[]).map((value) => (
            <Toggle key={value} value={value} className={SEGMENT_CLASS}>
              {RELEASE_FILTER_LABELS[value]}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>

      {preset === "custom" ? (
        <div className="animate-in duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none">
          <DateRangeFilter id="commission-date-range" from={customFrom} to={customTo} onChange={onCustomRangeChange} />
        </div>
      ) : null}
    </div>
  )
}
