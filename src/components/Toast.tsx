// ToastContainer — renders the stack of active toast notifications.

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { Toast } from "../lib/types";

const config = {
  success: { icon: CheckCircle2, bar: "bg-emerald-500", ring: "bg-white" },
  error: { icon: XCircle, bar: "bg-rose-500", ring: "bg-white" },
  info: { icon: Info, bar: "bg-sky-500", ring: "bg-white" },
};

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-3">
      {toasts.map((t) => {
        const { icon: Icon, bar } = config[t.type];
        return (
          <div
            key={t.id}
            className="flex items-start gap-3 overflow-hidden rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
          >
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${bar}`}>
              <Icon className="h-4 w-4 text-white" />
            </span>
            <p className="flex-1 text-sm leading-snug text-slate-700">{t.message}</p>
            <button
              onClick={() => onClose(t.id)}
              className="text-slate-400 transition hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
