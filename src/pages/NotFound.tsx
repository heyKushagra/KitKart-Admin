// NotFound — simple 404 page for unknown routes.

import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-sky-500 shadow-sm ring-1 ring-slate-200">
        <Compass className="h-8 w-8" />
      </span>
      <h1 className="text-2xl font-bold text-slate-800">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/dashboard"
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
