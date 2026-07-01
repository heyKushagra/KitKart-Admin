// Customers page — read-only searchable table.

import { useEffect, useMemo, useState } from "react";
import { customersApi } from "../lib/api";
import type { Customer } from "../lib/types";
import { SearchInput } from "../components/SearchInput";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    customersApi.list().then((data) => {
      setCustomers(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.phone, c.location].some((f) => f.toLowerCase().includes(q))
    );
  }, [customers, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search customers…" />
        <p className="text-sm text-slate-400">{filtered.length} customer{filtered.length !== 1 && "s"}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No customers found" description={query ? "Try a different search term." : "Customers will appear here."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Orders</th>
                  <th className="px-5 py-3 font-semibold">Total Spent</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                          {c.name.charAt(0)}
                        </span>
                        <span className="font-medium text-slate-700">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-600">{c.email}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c.location}</td>
                    <td className="px-5 py-3 text-slate-600">{c.orders}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">Rs.{c.spent.toFixed(2)}</td>
                    <td className="px-5 py-3 text-slate-500">{c.joinedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
