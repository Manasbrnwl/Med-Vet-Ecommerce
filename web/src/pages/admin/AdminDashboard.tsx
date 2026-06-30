import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, DollarSign, ShoppingBag, ShoppingCart, Users, AlertCircle } from "lucide-react";
import { api } from "../../api/client";

interface DashboardStats {
  products: number;
  orders: number;
  users: number;
  pendingOrders: number;
  totalRevenue: number | string;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<DashboardStats>("/admin/stats"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-2">
        <AlertCircle size={18} />
        <span>Failed to load store statistics. Please try again later.</span>
      </div>
    );
  }

  const revenue = typeof stats.totalRevenue === "string" ? parseFloat(stats.totalRevenue) : stats.totalRevenue;

  const statCards = [
    {
      label: "Total Sales",
      value: `$${revenue.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <DollarSign className="text-teal-600 w-6 h-6" />,
      bg: "bg-teal-50",
    },
    {
      label: "Orders Made",
      value: stats.orders,
      icon: <ShoppingCart className="text-blue-600 w-6 h-6" />,
      bg: "bg-blue-50",
      link: "/admin/orders",
    },
    {
      label: "Catalog Products",
      value: stats.products,
      icon: <ShoppingBag className="text-emerald-600 w-6 h-6" />,
      bg: "bg-emerald-50",
      link: "/admin/products",
    },
    {
      label: "Registered Users",
      value: stats.users,
      icon: <Users className="text-purple-600 w-6 h-6" />,
      bg: "bg-purple-50",
      link: "/admin/users",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time statistics and administrative actions.</p>
      </div>

      {stats.pendingOrders > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="font-semibold text-sm">Action Needed</p>
              <p className="text-xs text-amber-700">{stats.pendingOrders} pending orders require processing.</p>
            </div>
          </div>
          <Link
            to="/admin/orders?status=PENDING"
            className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 hover:underline"
          >
            Review Orders <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.bg}`}>{card.icon}</div>
            </div>
            {card.link && (
              <Link
                to={card.link}
                className="text-xs font-semibold text-brand hover:text-brand-dark mt-4 inline-flex items-center gap-1 transition-colors"
              >
                Manage list <ArrowRight size={12} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Admin Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            to="/admin/products"
            className="p-4 border border-gray-50 bg-gray-50/50 hover:bg-teal-50/30 hover:border-brand/20 rounded-xl transition-all"
          >
            <p className="font-semibold text-sm text-gray-950">Add Product</p>
            <p className="text-xs text-gray-500 mt-1">Create simple/variable products with inventory.</p>
          </Link>
          <Link
            to="/admin/coupons"
            className="p-4 border border-gray-50 bg-gray-50/50 hover:bg-teal-50/30 hover:border-brand/20 rounded-xl transition-all"
          >
            <p className="font-semibold text-sm text-gray-950">Create Coupon</p>
            <p className="text-xs text-gray-500 mt-1">Set discount percentage or fixed totals.</p>
          </Link>
          <Link
            to="/admin/reviews"
            className="p-4 border border-gray-50 bg-gray-50/50 hover:bg-teal-50/30 hover:border-brand/20 rounded-xl transition-all"
          >
            <p className="font-semibold text-sm text-gray-950">Moderate Reviews</p>
            <p className="text-xs text-gray-500 mt-1">Approve pending reviews for product pages.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
