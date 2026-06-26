import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Routes, Route, Link, NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Package, LogOut } from "lucide-react";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import type { OrderSummary, User as UserType } from "../api/types";

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function Orders() {
  const { data, isLoading } = useQuery({
    queryKey: ["account", "orders"],
    queryFn: () => api.get<{ orders: OrderSummary[]; meta: { total: number } }>("/account/orders"),
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Loading orders…</p>;

  const orders = data?.orders ?? [];

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Package size={40} className="mx-auto mb-3" />
        <p>No orders yet.</p>
        <Link to="/shop" className="text-brand hover:underline text-sm mt-2 inline-block">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">#{order.id}</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <span className="font-semibold text-gray-900">S${Number(order.total).toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400">
            {new Date(order.createdAt).toLocaleDateString("en-SG", { dateStyle: "medium" })}
            {" · "}
            {order._count.items} item{order._count.items !== 1 ? "s" : ""}
            {order.paymentMethodTitle && ` · ${order.paymentMethodTitle}`}
          </p>
        </div>
      ))}
    </div>
  );
}

function Profile() {
  const { user } = useAuthStore();
  const { data } = useQuery({
    queryKey: ["account", "me"],
    queryFn: () => api.get<UserType>("/account/me"),
    enabled: !!user,
  });

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-gray-900">Profile</h2>
      {data && (
        <dl className="text-sm space-y-2">
          <div className="flex gap-4">
            <dt className="text-gray-500 w-24">Name</dt>
            <dd className="text-gray-800">{[data.firstName, data.lastName].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-gray-500 w-24">Email</dt>
            <dd className="text-gray-800">{data.email}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-gray-500 w-24">Phone</dt>
            <dd className="text-gray-800">{data.phone || "—"}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export default function Account() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login", { state: { from: "/account" } });
  }, [user, navigate]);

  if (!user) return null;

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-brand-light text-brand" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet><title>My Account — VetMedAgri</title></Helmet>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <nav className="space-y-1 md:col-span-1">
          <NavLink to="/account" end className={navCls}>
            <User size={16} /> Profile
          </NavLink>
          <NavLink to="/account/orders" className={navCls}>
            <Package size={16} /> Orders
          </NavLink>
          <button
            onClick={clearAuth}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </nav>

        {/* Content */}
        <div className="md:col-span-3">
          <Routes>
            <Route index element={<Profile />} />
            <Route path="orders" element={<Orders />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
