"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DateTimePicker({
  date,
  setDate,
  placeholder,
}: {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  const [time, setTime] = React.useState<string>("");

  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) {
      setDate(undefined);
      return;
    }

    // Merge time if already selected
    if (time) {
      const [hours, minutes] = time.split(":").map(Number);
      newDate.setHours(hours, minutes, 0, 0);
    }
    setDate(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);

    if (date && newTime) {
      const [hours, minutes] = newTime.split(":").map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      setDate(newDate);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Calendar Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder || "Pick a date"}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Time Picker */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <input
          type="time"
          value={time}
          onChange={handleTimeChange}
          className="border rounded-md px-2 py-1 text-sm"
        />
      </div>

      {/* Display Full Date+Time */}
      {date && (
        <p className="text-sm text-muted-foreground">
          Selected: {format(date, "MMM d, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
}
