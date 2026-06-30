import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, AlertCircle } from "lucide-react";
import { api } from "../../api/client";
import type { ListMeta } from "../../api/types";

interface CouponsResponse {
  data: any[];
  meta: ListMeta;
}

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"FIXED_CART" | "PERCENT" | "FIXED_PRODUCT">("FIXED_CART");
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formDescription, setFormDescription] = useState("");
  const [formUsageLimit, setFormUsageLimit] = useState<number | "">("");
  const [formExpiresAt, setFormExpiresAt] = useState("");

  // Query coupons
  const { data, isLoading } = useQuery<CouponsResponse>({
    queryKey: ["admin", "coupons", page],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", "15");
      return api.get<CouponsResponse>(`/admin/coupons?${q}`);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newCoupon: any) => api.post("/admin/coupons", newCoupon),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create coupon");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
  });

  function resetForm() {
    setFormCode("");
    setFormType("FIXED_CART");
    setFormAmount("");
    setFormDescription("");
    setFormUsageLimit("");
    setFormExpiresAt("");
    setErrorMsg("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formCode.trim() || formAmount === "") return;
    createMutation.mutate({
      code: formCode,
      type: formType,
      amount: Number(formAmount),
      description: formDescription || null,
      usageLimit: formUsageLimit === "" ? null : Number(formUsageLimit),
      expiresAt: formExpiresAt || null,
    });
  }

  const coupons = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Coupons &amp; Offers</h1>
          <p className="text-sm text-gray-500 mt-1">Configure cart discounts, percent markdowns, or special promotions.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-brand text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-dark transition-all shadow-xs"
        >
          <Plus size={16} /> New Coupon
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Coupon Code</th>
                <th className="p-4">Type</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Limit / Usage</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                [1, 2].map((n) => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-12" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="p-4 pr-6"><div className="h-4 bg-gray-100 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No coupons configured yet.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const isExpired = c.expiresAt ? new Date(c.expiresAt) < new Date() : false;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div>
                          <p className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 inline-block">
                            {c.code}
                          </p>
                          {c.description && <p className="text-xs text-gray-400 mt-1">{c.description}</p>}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-gray-600">
                        {c.type === "PERCENT"
                          ? "Percentage"
                          : c.type === "FIXED_CART"
                          ? "Fixed Cart"
                          : "Fixed Product"}
                      </td>
                      <td className="p-4 font-semibold text-gray-900">
                        {c.type === "PERCENT" ? `${Number(c.amount)}%` : `$${Number(c.amount).toFixed(2)}`}
                      </td>
                      <td className="p-4 text-gray-500 font-medium">
                        {c.usageLimit ? `Limit: ${c.usageLimit}` : "Unlimited"}
                      </td>
                      <td className="p-4">
                        {c.expiresAt ? (
                          <span className={`text-xs ${isExpired ? "text-red-500 font-medium" : "text-gray-400"}`}>
                            {new Date(c.expiresAt).toLocaleDateString("en-SG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            {isExpired && " (Expired)"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Never Expires</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Delete this coupon permanently?")) deleteMutation.mutate(c.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Delete Coupon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 p-4">
            <span className="text-xs text-gray-500">
              Showing page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">Create New Coupon</h3>
                <p className="text-xs text-gray-500">Add a cart-level or item discount code.</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. VMA20"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20 uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="FIXED_CART">Fixed Cart ($)</option>
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="FIXED_PRODUCT">Fixed Product ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Discount Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 15.00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formUsageLimit}
                    onChange={(e) => setFormUsageLimit(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. 15% discount for bulk cattle purchases"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="border-t border-gray-50 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
