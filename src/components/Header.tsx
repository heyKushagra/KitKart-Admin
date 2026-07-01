// Header — top bar with mobile menu button, page title, and logout.

import { LogOut, Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/orders": "Orders",
  "/customers": "Customers",
};

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "KitKart";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>

      <button
        onClick={logout}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
