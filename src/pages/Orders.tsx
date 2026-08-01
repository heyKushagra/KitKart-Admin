// Orders page — searchable table with inline-editable status badges.

import { useEffect, useMemo, useState } from "react";
import { ordersApi, productsApi } from "../lib/api";
import type { Order, OrderStatus, Product } from "../lib/types";
import { useToast } from "../context/ToastContext";
import { Badge, statusTone } from "../components/Badge";
import { SearchInput } from "../components/SearchInput";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { ChevronDown, X } from "lucide-react";

const STATUSES: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

export function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ordersData, productsData] = await Promise.all([ordersApi.list(), productsApi.list()]);
        if (!active) return;
        setOrders(ordersData || []);
        setProducts(productsData || []);
      } catch (err) {
        console.error("Orders load error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      [o.id, o.customerName, o.customerEmail, o.customerPhone, o.status, o.customerAddress].some((f) => f && f.toLowerCase().includes(q))
    );
  }, [orders, query]);

  async function changeStatus(order: Order, status: OrderStatus) {
    setOpenMenu(null);
    if (order.status === status) return;
    try {
      const updated = await ordersApi.updateStatus(order.id, status);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(updated);
      }
      toast.success(`Order ${order.id} marked as ${status}`);
    } catch {
      toast.error("Could not update order status");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search orders…" />
        <p className="text-sm text-slate-400">{filtered.length} order{filtered.length !== 1 && "s"}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No orders found" description={query ? "Try a different search term." : "Orders will appear here."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Order ID</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Shipping</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-700">{o.id}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-700">{o.customerName}</p>
                      <p className="text-xs text-slate-500">{o.customerEmail}</p>
                      <p className="text-xs text-slate-400">{o.customerPhone}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={o.customerAddress}>
                      {o.customerAddress}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        {o.products && o.products.length > 0 ? (
                          o.products.map((p, idx) => (
                            <span key={idx} className="text-xs text-slate-600 truncate" title={`${p.quantity}x ${p.name}`}>
                              {p.quantity}x {p.name} {p.size ? `(${p.size})` : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No items</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-700">₹{(o.order_total ?? o.total).toFixed(2)}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        {o.payment_type === "Partial COD" ? (
                          <>
                            <div className="w-fit"><Badge tone="amber">Partial COD</Badge></div>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                              ₹{o.advance_paid || 149} Paid + ₹{o.cod_amount ?? ((o.order_total ?? o.total) - (o.advance_paid || 149))} COD
                            </span>
                          </>
                        ) : (
                          <div className="w-fit"><Badge tone="green">{o.payment_type || o.paymentMethod || "Prepaid"}</Badge></div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{o.date}</td>
                    <td className="px-5 py-3">
                      {/* Inline status dropdown using overlay select to avoid clipping */}
                      <div className="relative inline-block mb-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full pointer-events-none">
                          <Badge tone={statusTone(o.status)}>
                            {o.status}
                            <ChevronDown className="h-3 w-3" />
                          </Badge>
                        </div>
                        <select
                          value={o.status}
                          onChange={(e) => changeStatus(o, e.target.value as OrderStatus)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      {o.shiprocket_status && (
                        <div className="mt-1 flex flex-col gap-1">
                          {o.shiprocket_status === "Failed" ? (
                            <div className="w-fit"><Badge tone="red">SR: Failed</Badge></div>
                          ) : (
                            <div className="w-fit"><Badge tone="blue">SR: {o.shiprocket_status}</Badge></div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Order Details</h3>
                <p className="text-xs text-slate-400">ID: {selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status and Date */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Status</span>
                  <div className="relative inline-block">
                    <div className="inline-flex items-center gap-1.5 rounded-full pointer-events-none">
                      <Badge tone={statusTone(selectedOrder.status)}>
                        {selectedOrder.status}
                        <ChevronDown className="h-3 w-3" />
                      </Badge>
                    </div>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => changeStatus(selectedOrder, e.target.value as OrderStatus)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Order Date</span>
                  <span className="font-semibold text-slate-700">{selectedOrder.date}</span>
                </div>
              </div>

              {/* Customer and Shipping details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Customer Info</h4>
                  <div className="space-y-1 text-sm text-slate-650">
                    <p className="font-semibold text-slate-800">{selectedOrder.customerName}</p>
                    <p>{selectedOrder.customerEmail}</p>
                    <p>{selectedOrder.customerPhone}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Shipping Address</h4>
                  <p className="text-sm text-slate-650 leading-relaxed">{selectedOrder.customerAddress}</p>
                </div>
              </div>

              {/* Products list */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Items Ordered</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {selectedOrder.products.map((p, idx) => {
                    const baseId = p.id.split("-")[0];
                    const dbProd = products.find((prod) => prod.id === baseId);
                    const hasDiscount = dbProd && dbProd.price !== undefined && dbProd.price > p.price;

                    return (
                      <div key={idx} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                              No Img
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                          <p className="text-xs text-slate-400">
                            {p.size ? `Size: ${p.size}` : "Standard Size"}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-slate-800">Rs.{(p.price * p.quantity).toFixed(2)}</p>
                          <p className="text-xs text-slate-400">
                            {p.quantity} x{" "}
                            {hasDiscount ? (
                              <>
                                <span className="line-through text-slate-400 mr-1">
                                  Rs.{dbProd.price?.toFixed(2)}
                                </span>
                                <span className="text-rose-500 font-semibold">
                                  Rs.{p.price.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              `Rs.${p.price.toFixed(2)}`
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
              
              {/* Shipping / Shiprocket Section */}
              <div className="bg-slate-50 p-5 rounded-xl space-y-4 border border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipping & Tracking (Shiprocket)</h4>
                {selectedOrder.shiprocket_status === "Failed" && (
                  <div className="bg-rose-100 text-rose-800 p-3 rounded-lg text-sm border border-rose-200">
                    <p className="font-bold">Shiprocket order creation failed</p>
                    {selectedOrder.shiprocket_error && <p className="mt-1 text-xs opacity-90">{selectedOrder.shiprocket_error}</p>}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Shiprocket Status</span>
                    <span className="font-medium text-slate-700">{selectedOrder.shiprocket_status || "Not Available"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Shipment Status</span>
                    <span className="font-medium text-slate-700">{selectedOrder.shipment_status || "Not Available"}</span>
                  </div>
                  {(selectedOrder.shiprocket_order_id || selectedOrder.shipment_id) && (
                    <>
                      <div>
                        <span className="text-xs text-slate-500 block">SR Order ID</span>
                        <span className="font-medium text-slate-700">{selectedOrder.shiprocket_order_id || "-"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Shipment ID</span>
                        <span className="font-medium text-slate-700">{selectedOrder.shipment_id || "-"}</span>
                      </div>
                    </>
                  )}
                  {selectedOrder.awb_code && (
                    <>
                      <div>
                        <span className="text-xs text-slate-500 block">AWB Code</span>
                        <span className="font-medium text-slate-700">{selectedOrder.awb_code}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Courier</span>
                        <span className="font-medium text-slate-700">{selectedOrder.courier_name || "-"}</span>
                      </div>
                    </>
                  )}
                </div>
                {selectedOrder.tracking_url && (
                  <div className="mt-2">
                    <a href={selectedOrder.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                      Track Shipment
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer (Payment Details) */}
            <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="text-left min-w-[250px] space-y-2 w-full sm:w-auto">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Details</h4>
                  
                  {selectedOrder.payment_type === "Partial COD" ? (
                    <div className="space-y-2 mt-2 bg-white p-4 rounded-lg border border-amber-100 shadow-sm">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Payment Type:</span>
                        <span className="font-semibold text-amber-700">Partial COD</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Amount:</span>
                        <span className="font-medium text-slate-800">₹{(selectedOrder.order_total ?? selectedOrder.total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Advance Paid:</span>
                        <span className="font-medium text-emerald-600">₹{(selectedOrder.advance_paid || 149).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-2 mt-1">
                        <span className="text-slate-800">COD Due:</span>
                        <span className="text-rose-600">₹{(selectedOrder.cod_amount ?? ((selectedOrder.order_total ?? selectedOrder.total) - (selectedOrder.advance_paid || 149))).toFixed(2)}</span>
                      </div>
                      {selectedOrder.payment_status && (
                        <div className="flex justify-between text-xs mt-1 pt-2 border-t border-slate-50">
                          <span className="text-slate-400">Status:</span>
                          <span className="font-medium text-slate-600">{selectedOrder.payment_status}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Payment Type:</span>
                        <span className="font-semibold text-emerald-700">{selectedOrder.payment_type || selectedOrder.paymentMethod || "Prepaid"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Amount:</span>
                        <span className="font-medium text-slate-800">₹{(selectedOrder.order_total ?? selectedOrder.total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Paid Online:</span>
                        <span className="font-medium text-emerald-600">₹{(selectedOrder.order_total ?? selectedOrder.total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-2 mt-1">
                        <span className="text-slate-800">COD Due:</span>
                        <span className="text-slate-400">₹0.00</span>
                      </div>
                      {selectedOrder.payment_status && (
                        <div className="flex justify-between text-xs mt-1 pt-2 border-t border-slate-50">
                          <span className="text-slate-400">Status:</span>
                          <span className="font-medium text-slate-600">{selectedOrder.payment_status}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legacy discount logic just in case it's needed */}
                  {selectedOrder.discountAmount ? (
                    <div className="text-xs text-slate-400 mt-2 text-right">
                      Includes discount {selectedOrder.discountName ? `(${selectedOrder.discountName})` : ''}: -₹{selectedOrder.discountAmount.toFixed(2)}
                    </div>
                  ) : null}
                </div>
                
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition sm:self-end mt-2 sm:mt-0"
                >
                  Close
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
