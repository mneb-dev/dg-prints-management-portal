import { DateRangeFilter } from "@/components/date-range-filter"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PERIOD_PRESET_LABELS, type PeriodPreset } from "@/lib/finance-period"
import type { UserOption } from "@/lib/users"

export type CommissionReleaseFilter = "all" | "released" | "unreleased"

const RELEASE_FILTER_LABELS: Record<CommissionReleaseFilter, string> = {
  all: "All",
  released: "Released",
  unreleased: "Unreleased",
}

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
  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center gap-3">
        <Select value={preset} onValueChange={(value) => value && onPresetChange(value as PeriodPreset)}>
          <SelectTrigger size="sm" className="w-40 text-xs">
            <SelectValue>{(value: string | null) => PERIOD_PRESET_LABELS[(value as PeriodPreset) ?? preset]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {presets.map((value) => (
              <SelectItem key={value} value={value}>
                {PERIOD_PRESET_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preset === "custom" ? (
          <DateRangeFilter
            id="commission-date-range"
            from={customFrom}
            to={customTo}
            onChange={onCustomRangeChange}
          />
        ) : null}

        {staffOptions && onSelectedStaffIdChange ? (
          <Select
            value={selectedStaffId || "all"}
            onValueChange={(value) => value && onSelectedStaffIdChange(value === "all" ? "" : value)}
          >
            <SelectTrigger size="sm" className="w-48 text-xs">
              <SelectValue>
                {() =>
                  selectedStaffId
                    ? (staffOptions.find((u) => u.id === selectedStaffId)?.firstName ?? "All staff") +
                      " " +
                      (staffOptions.find((u) => u.id === selectedStaffId)?.lastName ?? "")
                    : "All staff"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              {staffOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.firstName} {option.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={releaseFilter}
          onValueChange={(value) => value && onReleaseFilterChange(value as CommissionReleaseFilter)}
        >
          <SelectTrigger size="sm" className="w-32 text-xs">
            <SelectValue>{(value: string | null) => RELEASE_FILTER_LABELS[(value as CommissionReleaseFilter) ?? releaseFilter]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RELEASE_FILTER_LABELS) as CommissionReleaseFilter[]).map((value) => (
              <SelectItem key={value} value={value}>
                {RELEASE_FILTER_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}
