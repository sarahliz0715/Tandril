import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const presetRanges = [
  {
    label: "Last 7 days",
    value: "7d",
    getDates: () => ({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date()
    })
  },
  {
    label: "Last 30 days", 
    value: "30d",
    getDates: () => ({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    })
  },
  {
    label: "This month",
    value: "month",
    getDates: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now
      };
    }
  },
  {
    label: "Last month",
    value: "last_month", 
    getDates: () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: lastMonth,
        to: lastDay
      };
    }
  },
  {
    label: "This quarter",
    value: "quarter",
    getDates: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), quarter * 3, 1),
        to: now
      };
    }
  },
  {
    label: "This year",
    value: "year", 
    getDates: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: now
      };
    }
  }
];

export function DateRangePicker({ date, onDateChange, className }) {
  const [selectedPreset, setSelectedPreset] = React.useState("30d");

  const handlePresetChange = (presetValue) => {
    setSelectedPreset(presetValue);
    const preset = presetRanges.find(p => p.value === presetValue);
    if (preset && preset.getDates) {
      const dates = preset.getDates();
      onDateChange(dates);
    }
  };

  const formatDateRange = () => {
    if (!date?.from) return "Select date range";
    if (!date?.to) return format(date.from, "LLL dd, y");
    if (date.from.getTime() === date.to.getTime()) {
      return format(date.from, "LLL dd, y");
    }
    return `${format(date.from, "LLL dd")} - ${format(date.to, "LLL dd, y")}`;
  };

  // Get the current preset label for display
  const currentPresetLabel = React.useMemo(() => {
    const preset = presetRanges.find(p => p.value === selectedPreset);
    return preset?.label || "Last 30 days";
  }, [selectedPreset]);

  return (
    <div className={`grid gap-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className="w-[300px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="flex flex-col border-r">
              <div className="p-3">
                <h4 className="font-medium mb-2">Quick Select</h4>
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={currentPresetLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    {presetRanges.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}