import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Eye, Calendar, CreditCard, Mail, Phone, MapPin, X } from "lucide-react";
import { api } from "../../api/client";
import type { ListMeta } from "../../api/types";

interface OrdersResponse {
  data: any[];
  meta: ListMeta;
}

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("date_desc");
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);

  // Get list of orders
  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ["admin", "orders", page, search, statusFilter, paymentMethodFilter, sortFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", "15");
      if (search) q.set("q", search);
      if (statusFilter) q.set("status", statusFilter);
      if (paymentMethodFilter) q.set("paymentMethod", paymentMethodFilter);
      if (sortFilter) q.set("sort", sortFilter);
      return api.get<OrdersResponse>(`/admin/orders?${q}`);
    },
  });

  // Get single order details (when clicked)
  const { data: orderDetails, isLoading: isLoadingDetails } = useQuery<any>({
    queryKey: ["admin", "order", viewingOrder?.id],
    queryFn: () => api.get<any>(`/admin/orders/${viewingOrder.id}`),
    enabled: !!viewingOrder,
  });

  // Update order status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/admin/orders/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "order", viewingOrder?.id] });
    },
  });

  const orders = data?.data ?? [];
  const meta = data?.meta;

  const orderStatuses = [
    { label: "Pending", value: "PENDING", bg: "bg-amber-50 text-amber-700 border-amber-200" },
    { label: "Processing", value: "PROCESSING", bg: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "On Hold", value: "ON_HOLD", bg: "bg-purple-50 text-purple-700 border-purple-200" },
    { label: "Completed", value: "COMPLETED", bg: "bg-green-50 text-green-700 border-green-200" },
    { label: "Cancelled", value: "CANCELLED", bg: "bg-red-50 text-red-700 border-red-200" },
    { label: "Refunded", value: "REFUNDED", bg: "bg-gray-100 text-gray-700 border-gray-200" },
    { label: "Failed", value: "FAILED", bg: "bg-rose-50 text-rose-700 border-rose-200" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Orders Registry</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor transaction statuses, delivery details, and customer billing.</p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 border border-gray-100 rounded-2xl space-y-4 shadow-xs animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search email or key..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            <button
              onClick={() => { setStatusFilter(""); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "" ? "bg-brand text-white shadow-xs" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              All
            </button>
            {orderStatuses.map((st) => (
              <button
                key={st.value}
                onClick={() => { setStatusFilter(st.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === st.value
                    ? "bg-brand text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary filters: Payment Method and Sorting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-50 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Payment Method</label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-gray-200 text-xs font-semibold rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/30 text-gray-700"
            >
              <option value="">All Payment Methods</option>
              <option value="hitpay">HitPay / PayNow</option>
              <option value="cod">Cash on Delivery</option>
              <option value="bacs">Direct Bank Transfer</option>
              <option value="cheque">Cheque Payment</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Sort Orders</label>
            <select
              value={sortFilter}
              onChange={(e) => {
                setSortFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white border border-gray-200 text-xs font-semibold rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/30 text-gray-700"
            >
              <option value="date_desc">Date: Newest first</option>
              <option value="date_asc">Date: Oldest first</option>
              <option value="total_desc">Total: High to Low</option>
              <option value="total_asc">Total: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Order Info</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Status</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                [1, 2, 3].map((n) => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-8" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-14" /></td>
                    <td className="p-4 pr-6"><div className="h-4 bg-gray-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const statusInfo = orderStatuses.find((s) => s.value === o.status) || {
                    label: o.status,
                    bg: "bg-gray-100 text-gray-700",
                  };
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div>
                          <p className="font-semibold text-gray-900">#{o.id}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(o.createdAt).toLocaleDateString("en-SG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-800">
                            {o.billing?.firstName || o.user?.firstName || "Guest"}{" "}
                            {o.billing?.lastName || o.user?.lastName || ""}
                          </p>
                          <p className="text-xs text-gray-400">{o.customerEmail}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.bg}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 font-medium">{o._count?.items ?? 0} items</td>
                      <td className="p-4 font-semibold text-gray-900">
                        ${Number(o.total).toFixed(2)}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => setViewingOrder(o)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-teal-50 hover:text-brand border border-gray-100 rounded-lg text-xs font-semibold text-gray-600 transition-colors"
                        >
                          <Eye size={13} /> View Detail
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

      {/* Details Side Drawer or Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-extrabold text-gray-950 text-lg">Order Details</h3>
                <p className="text-xs text-gray-500">Invoice, items, billing details, and workflow state.</p>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="p-12 text-center animate-pulse space-y-4">
                <div className="h-6 bg-gray-100 rounded w-1/3 mx-auto" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto" />
              </div>
            ) : !orderDetails ? (
              <div className="p-8 text-center text-red-500">Failed to load order.</div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-teal-50/40 border border-teal-100 rounded-xl p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status Controller</p>
                    <select
                      value={orderDetails.status}
                      disabled={statusMutation.isPending}
                      onChange={(e) => statusMutation.mutate({ id: orderDetails.id, status: e.target.value })}
                      className="bg-white border border-gray-200 text-sm font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-brand/20 focus:outline-none"
                    >
                      {orderStatuses.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date Created</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1 mt-0.5 justify-end">
                      <Calendar size={13} />
                      {new Date(orderDetails.createdAt).toLocaleString("en-SG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer & Billing */}
                  <div className="space-y-3 bg-gray-50/50 border border-gray-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Billing & Customer</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">
                        {orderDetails.billing?.firstName || orderDetails.user?.firstName || "Guest"}{" "}
                        {orderDetails.billing?.lastName || orderDetails.user?.lastName || ""}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail size={13} />
                        {orderDetails.customerEmail}
                      </p>
                      {orderDetails.billing?.phone && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone size={13} />
                          {orderDetails.billing.phone}
                        </p>
                      )}
                      {orderDetails.billing && (
                        <div className="flex gap-1.5 text-xs text-gray-500 pt-1 border-t border-gray-100">
                          <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                          <p>
                            {orderDetails.billing.address1}
                            {orderDetails.billing.address2 ? `, ${orderDetails.billing.address2}` : ""},
                            <br />
                            Singapore {orderDetails.billing.postcode}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-3 bg-gray-50/50 border border-gray-100 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Details</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CreditCard size={13} />
                        <span>Method: {orderDetails.paymentMethodTitle || orderDetails.paymentMethod || "COD"}</span>
                      </p>
                      {orderDetails.datePaid && (
                        <p className="text-xs text-gray-500">
                          Paid: {new Date(orderDetails.datePaid).toLocaleString("en-SG")}
                        </p>
                      )}
                      <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
                        <span className="text-xs text-gray-500">Total Charged:</span>
                        <span className="text-xl font-extrabold text-gray-950">${Number(orderDetails.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Order Items</h4>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                          <th className="p-3 pl-4">Product</th>
                          <th className="p-3">Qty</th>
                          <th className="p-3 text-right pr-4">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs">
                        {orderDetails.items?.map((item: any) => (
                          <tr key={item.id}>
                            <td className="p-3 pl-4">
                              <p className="font-semibold text-gray-900">{item.name}</p>
                              {item.sku && <p className="text-[10px] text-gray-400 font-mono">SKU: {item.sku}</p>}
                            </td>
                            <td className="p-3 text-gray-500 font-medium">x {item.quantity}</td>
                            <td className="p-3 text-right pr-4 font-semibold text-gray-900">
                              ${(Number(item.price) * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
