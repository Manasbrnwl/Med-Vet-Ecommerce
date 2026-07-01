import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, TrendingUp } from "lucide-react";
import { api } from "../../api/client";
import type { ListMeta } from "../../api/types";

interface SalesRow {
  productId: number;
  name: string;
  sku: string | null;
  slug: string | null;
  stockQuantity: number | null;
  stockStatus: string | null;
  unitsSold: number;
  bonusUnits: number;
  revenue: string;
  orders: number;
}
interface SalesResponse { data: SalesRow[]; meta: ListMeta; }

interface CustomerRow {
  orderId: number;
  customer: string;
  email: string;
  status: string;
  date: string;
  units: number;
  bonus: number;
  total: string;
}

export default function AdminSales() {
  const [page, setPage] = useState(1);
  const [drill, setDrill] = useState<SalesRow | null>(null);

  const { data, isLoading } = useQuery<SalesResponse>({
    queryKey: ["admin", "sales", page],
    queryFn: () => api.get<SalesResponse>(`/admin/sales/products?page=${page}&limit=25`),
  });

  const { data: customers } = useQuery<{ data: CustomerRow[] }>({
    queryKey: ["admin", "sales", "customers", drill?.productId],
    queryFn: () => api.get(`/admin/sales/products/${drill!.productId}/customers`),
    enabled: !!drill,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight flex items-center gap-2">
          <TrendingUp size={26} className="text-brand" /> Sales by Product
        </h1>
        <p className="text-sm text-gray-500 mt-1">Units sold per product, bonus units given, and who ordered.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-bold">Product</th>
              <th className="text-right px-4 py-3 font-bold">Units sold</th>
              <th className="text-right px-4 py-3 font-bold">Bonus given</th>
              <th className="text-right px-4 py-3 font-bold">Orders</th>
              <th className="text-right px-4 py-3 font-bold">Revenue</th>
              <th className="text-right px-4 py-3 font-bold">In stock</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No sales yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.productId} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800 line-clamp-1">{r.name}</div>
                  {r.sku && <div className="text-xs text-gray-400">{r.sku}</div>}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{r.unitsSold}</td>
                <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{r.bonusUnits || "—"}</td>
                <td className="px-4 py-3 text-right text-gray-600">{r.orders}</td>
                <td className="px-4 py-3 text-right text-gray-700">S${Number(r.revenue).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{r.stockQuantity ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setDrill(r)} className="text-xs font-bold text-brand hover:underline">
                    Who ordered →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40">Prev</button>
          <span className="text-sm text-gray-500">Page {meta.page} / {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40">Next</button>
        </div>
      )}

      {drill && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDrill(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-gray-900 line-clamp-1">{drill.name}</h2>
                <p className="text-xs text-gray-500">{drill.unitsSold} units across {drill.orders} orders</p>
              </div>
              <button onClick={() => setDrill(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50"><X size={18} /></button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold">Order</th>
                    <th className="text-left px-4 py-2 font-bold">Customer</th>
                    <th className="text-right px-4 py-2 font-bold">Units</th>
                    <th className="text-right px-4 py-2 font-bold">Bonus</th>
                    <th className="text-left px-4 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(customers?.data ?? []).map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">#{c.orderId}</td>
                      <td className="px-4 py-2"><div className="text-gray-800">{c.customer}</div><div className="text-xs text-gray-400">{c.email}</div></td>
                      <td className="px-4 py-2 text-right font-semibold">{c.units}</td>
                      <td className="px-4 py-2 text-right text-emerald-600">{c.bonus || "—"}</td>
                      <td className="px-4 py-2 text-xs">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
