// EmptyState — friendly placeholder shown when a table has no data / no results.

import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox className="h-7 w-7" />
      </span>
      <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
      {description && <p className="max-w-sm text-sm text-slate-400">{description}</p>}
      {action}
    </div>
  );
}
