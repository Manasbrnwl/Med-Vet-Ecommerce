import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Search, Menu, X } from "lucide-react";
import { useCartStore } from "../store/cart";
import { useAuthStore } from "../store/auth";

export default function Header() {
  const count = useCartStore((s) => s.count);
  const openCart = useCartStore((s) => s.openCart);
  const { user, clearAuth } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/shop?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  }

  const cartCount = count();

  return (
    <header className="sticky top-0 z-30 glass border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-16 gap-4">
        <Link to="/" className="flex-shrink-0 font-bold text-xl text-brand">
          VetMedAgri
        </Link>

        <nav className="hidden md:flex items-center gap-6 flex-1 ml-6">
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? "text-brand" : "text-gray-600 hover:text-brand"}`
            }
          >
            Shop
          </NavLink>
          {(user?.role === "ADMIN" || user?.role === "SHOP_MANAGER") && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? "text-brand" : "text-gray-600 hover:text-brand"}`
              }
            >
              Admin Panel
            </NavLink>
          )}
        </nav>

        <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-xs">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/account"
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand px-2 py-1 rounded"
              >
                <User size={18} />
                {user.firstName ?? user.email.split("@")[0]}
              </Link>
              <button
                onClick={clearAuth}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden md:flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand px-2 py-1 rounded"
            >
              <User size={18} />
              Sign in
            </Link>
          )}

          <button
            onClick={openCart}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={`Open cart, ${cartCount} items`}
          >
            <ShoppingCart size={20} className="text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-100 bg-white ${
          menuOpen ? "max-h-96 opacity-100 py-3 px-4" : "max-h-0 opacity-0 py-0 px-4 pointer-events-none"
        }`}
      >
        <div className="space-y-3">
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </form>
          <NavLink
            to="/shop"
            onClick={() => setMenuOpen(false)}
            className="block text-sm font-medium text-gray-700 py-1 hover:text-brand"
          >
            Shop
          </NavLink>
          {(user?.role === "ADMIN" || user?.role === "SHOP_MANAGER") && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-brand py-1 hover:underline"
            >
              Admin Panel
            </Link>
          )}
          {user ? (
            <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
              <Link to="/account" onClick={() => setMenuOpen(false)} className="text-sm font-semibold text-gray-700 hover:text-brand">
                My Account
              </Link>
              <button
                onClick={() => {
                  clearAuth();
                  setMenuOpen(false);
                }}
                className="text-xs font-semibold text-gray-400 hover:text-red-500"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-gray-700 py-1 hover:text-brand"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
