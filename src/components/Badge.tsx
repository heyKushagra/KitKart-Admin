// Badge — small colored pill used for statuses (orders, products, etc.).

import type { ReactNode } from "react";

type Tone = "green" | "amber" | "blue" | "slate" | "red" | "purple";

const tones: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/20",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

// Helper that maps common statuses to a tone + dot color.
export function statusTone(status: string): Tone {
  switch (status) {
    case "Delivered":
    case "Active":
    case "In Stock":
      return "green";
    case "Shipped":
      return "blue";
    case "Processing":
      return "amber";
    case "Pending":
      return "slate";
    case "Cancelled":
    case "Out of Stock":
      return "red";
    case "Draft":
      return "purple";
    default:
      return "slate";
  }
}
