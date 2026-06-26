import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "../store/cart";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, total, count } = useCartStore();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeCart}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-lg">Cart ({count()})</h2>
          <button onClick={closeCart} className="p-1 rounded hover:bg-gray-100" aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <ShoppingBag size={48} />
              <p>Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-contain rounded border border-gray-100 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="text-sm font-medium text-gray-800 hover:text-brand line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-0.5">S${item.price.toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQty(item.productId, item.variantId, item.qty - 1)}
                      className="p-0.5 rounded hover:bg-gray-100"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm w-6 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.variantId, item.qty + 1)}
                      className="p-0.5 rounded hover:bg-gray-100"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="ml-auto p-0.5 text-gray-400 hover:text-red-500"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t px-4 py-4 space-y-3">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>S${total().toFixed(2)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="block w-full text-center bg-brand text-white py-2.5 rounded-lg font-medium hover:bg-brand-dark transition-colors"
            >
              Checkout
            </Link>
            <Link
              to="/cart"
              onClick={closeCart}
              className="block w-full text-center text-brand border border-brand py-2.5 rounded-lg font-medium hover:bg-brand-light transition-colors"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
