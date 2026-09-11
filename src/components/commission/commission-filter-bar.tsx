import { format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  onCustomFromChange,
  customTo,
  onCustomToChange,
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
  onCustomFromChange: (value: string) => void
  customTo: string
  onCustomToChange: (value: string) => void
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
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-input px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="commission-date-from" className="text-sm text-muted-foreground">
                From
              </Label>
              <Popover>
                <PopoverTrigger
                  id="commission-date-from"
                  render={<Button variant="ghost" size="sm" className="h-8 px-1.5 font-normal" />}
                >
                  <span className={customFrom ? undefined : "text-muted-foreground"}>
                    {customFrom ? format(parseISO(customFrom), "MMM d, yyyy") : "Select date"}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customFrom ? parseISO(customFrom) : undefined}
                    onSelect={(date) => onCustomFromChange(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={[{ after: new Date() }, ...(customTo ? [{ after: parseISO(customTo) }] : [])]}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <Label htmlFor="commission-date-to" className="text-sm text-muted-foreground">
                To
              </Label>
              <Popover>
                <PopoverTrigger
                  id="commission-date-to"
                  render={<Button variant="ghost" size="sm" className="h-8 px-1.5 font-normal" />}
                >
                  <span className={customTo ? undefined : "text-muted-foreground"}>
                    {customTo ? format(parseISO(customTo), "MMM d, yyyy") : "Select date"}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customTo ? parseISO(customTo) : undefined}
                    onSelect={(date) => onCustomToChange(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={[{ after: new Date() }, ...(customFrom ? [{ before: parseISO(customFrom) }] : [])]}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
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
