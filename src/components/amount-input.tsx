"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { parseRawNumber } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** Format digits with thousand separators: 1250000 → 1,250,000 */
export function formatGroupedDigits(raw: string): string {
  const digitsOnly = raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\D/g, "");
  if (!digitsOnly) return "";
  const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

type AmountInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  /** Raw numeric string without separators, e.g. "1250000" */
  value: string;
  onValueChange: (rawDigits: string) => void;
};

export function AmountInput({
  value,
  onValueChange,
  className,
  ...props
}: AmountInputProps) {
  return (
    <Input
      {...props}
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      className={cn("text-left tabular-nums tracking-wide", className)}
      value={formatGroupedDigits(value)}
      onChange={(e) => {
        const cleaned = e.target.value
          .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
          .replace(/\D/g, "");
        if (!cleaned) {
          onValueChange("");
          return;
        }
        onValueChange(String(parseRawNumber(cleaned)));
      }}
    />
  );
}
