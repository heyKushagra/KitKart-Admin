// Dashboard — overview with stat cards and a recent-orders table.

import { useEffect, useState } from "react";
import { Package, ShoppingCart, Users, Wallet, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard";
import { Badge, statusTone } from "../components/Badge";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { ordersApi, productsApi, customersApi } from "../lib/api";
import type { Order } from "../lib/types";

export function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ products: 0, orders: 0, customers: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, o, c] = await Promise.all([
          productsApi.list(),
          ordersApi.list(),
          customersApi.list(),
        ]);
        if (!active) return;
        const safeP = p || [];
        const safeO = o || [];
        const safeC = c || [];
        const revenue = safeO
          .filter((ord) => ord && ord.status !== "Cancelled")
          .reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
        setStats({ products: safeP.length, orders: safeO.length, customers: safeC.length, revenue });
        setOrders(safeO.slice(0, 6));
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Products"
          value={String(stats.products)}
          icon={Package}
          tone="sky"
          trend={8}
          action={
            <Link
              to="/products"
              state={{ openAdd: true }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-sky-600 hover:bg-sky-600 hover:text-white transition"
              title="Add Product"
            >
              <Plus className="h-5 w-5 text-sky-900" />
            </Link>
          }
        />
        <StatCard label="Total Orders" value={String(stats.orders)} icon={ShoppingCart} tone="violet" trend={12} />
        <StatCard label="Customers" value={String(stats.customers)} icon={Users} tone="emerald" trend={5} />
        <StatCard label="Revenue" value={`Rs.${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={Wallet} tone="amber" trend={-3} />
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Recent Orders</h2>
          <Link
            to="/orders"
            className="text-sm font-medium text-sky-600 transition hover:text-sky-700"
          >
            View all →
          </Link>
        </div>

        {orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Orders will appear here once customers start buying." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-700">#{o.order_id || o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-3 text-slate-600">{o.customerName}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">Rs.{o.total.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{o.date}</td>
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
