"use client";

import { useState } from "react";
import moment from "jalali-moment";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatJalaliDate, getJalaliMonthName } from "@/lib/format";

interface JalaliDatePickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
}

function toIsoFromJalali(jYear: number, jMonth: number, jDay: number): string {
  return moment
    .from(`${jYear}/${jMonth}/${jDay}`, "fa", "jYYYY/jM/jD")
    .format("YYYY-MM-DD");
}

function fromIso(iso: string) {
  const m = moment(iso).locale("fa");
  return { year: m.jYear(), month: m.jMonth() + 1, day: m.jDate() };
}

export function JalaliDatePicker({
  value,
  onChange,
  className,
}: JalaliDatePickerProps) {
  const initial = value ? fromIso(value) : fromIso(new Date().toISOString());
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  const daysInMonth = moment()
    .jYear(year)
    .jMonth(month - 1)
    .jDaysInMonth();

  const years = Array.from({ length: 10 }, (_, i) => moment().jYear() - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const yearItems = Object.fromEntries(years.map((y) => [String(y), String(y)]));
  const monthItems = Object.fromEntries(
    months.map((m) => [String(m), getJalaliMonthName(m)])
  );
  const dayItems = Object.fromEntries(days.map((d) => [String(d), String(d)]));

  const apply = () => {
    onChange(toIsoFromJalali(year, month, day));
    setOpen(false);
  };

  const display = value ? formatJalaliDate(value) : "انتخاب تاریخ";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
          className
        )}
      >
        <span>{display}</span>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(parseInt(v ?? String(year)))}
            items={yearItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month)}
            onValueChange={(v) => {
              const m = parseInt(v ?? String(month));
              setMonth(m);
              const maxDay = moment().jYear(year).jMonth(m - 1).jDaysInMonth();
              if (day > maxDay) setDay(maxDay);
            }}
            items={monthItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {getJalaliMonthName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(day)}
            onValueChange={(v) => setDay(parseInt(v ?? String(day)))}
            items={dayItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {days.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full mt-3" size="sm" onClick={apply}>
          تأیید
        </Button>
      </PopoverContent>
    </Popover>
  );
}
