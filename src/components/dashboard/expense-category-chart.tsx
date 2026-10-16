"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatToman } from "@/lib/format";

type Slice = { name: string; value: number; color: string };

export function ExpenseCategoryChart({ data }: { data: Slice[] }) {
  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        هنوز هزینه‌ای ثبت نشده
      </p>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={`${entry.name}-${i}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatToman(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
