// StatCard — a single dashboard metric card with an icon and trend.

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "sky" | "emerald" | "violet" | "amber";
  trend?: number; // percentage change, e.g. 12 or -5
  action?: React.ReactNode;
}

const tones = {
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
};

export function StatCard({ label, value, icon: Icon, tone, trend, action }: StatCardProps) {
  const up = (trend ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-2">
          {action}
          {trend !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                up ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-800">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-400">{label}</p>
    </div>
  );
}
