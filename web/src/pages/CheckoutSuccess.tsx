import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get("order");

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <CheckCircle size={64} className="text-brand mx-auto mb-6" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
      {orderId && (
        <p className="text-gray-500 mb-1">Order #{orderId}</p>
      )}
      <p className="text-gray-500 mb-8">
        Thank you for your order. We will send you a confirmation email shortly.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/account"
          className="bg-brand text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors"
        >
          View My Orders
        </Link>
        <Link
          to="/shop"
          className="border border-brand text-brand px-6 py-2.5 rounded-xl font-medium hover:bg-brand-light transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
