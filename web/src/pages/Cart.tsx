import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "../store/cart";

export default function Cart() {
  const { items, removeItem, updateQty, total, clearCart } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={56} className="mx-auto text-gray-200 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Add some products to get started.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors"
        >
          Browse Products <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Helmet><title>Your Cart — VetMedAgri</title></Helmet>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
        <button
          onClick={clearCart}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          Clear cart
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.variantId}`}
              className="flex gap-4 bg-white rounded-xl border border-gray-100 p-4"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-contain rounded-lg border border-gray-50 flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-50 rounded-lg flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <Link
                  to={`/product/${item.slug}`}
                  className="font-medium text-gray-800 hover:text-brand text-sm leading-snug line-clamp-2"
                >
                  {item.name}
                </Link>
                {item.sku && (
                  <p className="text-xs text-gray-400 mt-0.5">SKU: {item.sku}</p>
                )}
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  S${item.price.toFixed(2)}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQty(item.productId, item.variantId, item.qty - 1)}
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Decrease"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm w-6 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.productId, item.variantId, item.qty + 1)}
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Increase"
                  >
                    <Plus size={14} />
                  </button>
                  <span className="ml-auto text-sm font-semibold text-gray-700">
                    S${(item.price * item.qty).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 h-fit space-y-4 sticky top-20">
          <h2 className="font-semibold text-gray-900">Order Summary</h2>
          <div className="space-y-2 text-sm text-gray-600">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="flex justify-between">
                <span className="line-clamp-1 flex-1 mr-2">{item.name} ×{item.qty}</span>
                <span>S${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>S${total().toFixed(2)}</span>
          </div>
          <Link
            to="/checkout"
            className="block w-full text-center bg-brand text-white py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors"
          >
            Proceed to Checkout
          </Link>
          <Link
            to="/shop"
            className="block text-center text-sm text-brand hover:underline"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
