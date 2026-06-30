import { useState } from "react";
import { Navigate, Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, ClipboardList, Users, Ticket, Star, ArrowLeft, Menu, X } from "lucide-react";
import { useAuthStore } from "../../store/auth";

export default function AdminLayout() {
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || (user.role !== "ADMIN" && user.role !== "SHOP_MANAGER")) {
    return <Navigate to="/login" replace />;
  }

  const menuItems = [
    { label: "Dashboard", path: "/admin", icon: <LayoutDashboard size={18} /> },
    { label: "Products", path: "/admin/products", icon: <ShoppingBag size={18} /> },
    { label: "Orders", path: "/admin/orders", icon: <ClipboardList size={18} /> },
    ...(user.role === "ADMIN" ? [{ label: "Users & Roles", path: "/admin/users", icon: <Users size={18} /> }] : []),
    { label: "Coupons", path: "/admin/coupons", icon: <Ticket size={18} /> },
    { label: "Reviews", path: "/admin/reviews", icon: <Star size={18} /> },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-gray-950 text-lg">Control Center</h2>
          <p className="text-xs text-brand font-medium">Role: {user.role.replace("_", " ")}</p>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.path === "/admin"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-brand/10 text-brand shadow-xs"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-50">
        <NavLink
          to="/"
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-500 hover:text-brand transition-colors"
        >
          <ArrowLeft size={14} /> Back to Storefront
        </NavLink>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50/50">
      {/* Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between h-16 px-6 bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <span className="font-extrabold text-gray-950 text-sm">Control Center</span>
        </div>
        <span className="text-xxs font-extrabold bg-brand/10 text-brand px-2.5 py-1 rounded-full uppercase tracking-wider">
          {user.role.replace("_", " ")}
        </span>
      </header>

      {/* Desktop Sidebar (static) */}
      <aside className="hidden md:flex w-64 border-r border-gray-100 bg-white flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer body */}
          <aside className="relative w-64 max-w-xs bg-white h-full flex flex-col z-50 animate-slide-in-left shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

