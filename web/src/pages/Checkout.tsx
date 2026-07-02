import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "../store/cart";
import { useAuthStore } from "../store/auth";
import { api } from "../api/client";
import { isExpired } from "../utils/expiry";

const schema = z.object({
  email: z.string().email("Valid email required"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  phone: z.string().optional(),
  address1: z.string().min(1, "Required"),
  address2: z.string().optional(),
  city: z.string().min(1, "Required"),
  postcode: z.string().min(1, "Required"),
  coupon: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CheckoutResponse {
  orderId: number;
  paymentUrl?: string;
}

export default function Checkout() {
  const { items, total, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email ?? "",
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    },
  });

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link to="/shop" className="text-brand hover:underline">Browse products</Link>
      </div>
    );
  }

  const expiredItems = items.filter((i) => isExpired(i.expiryDate));
  const hasExpired = expiredItems.length > 0;

  async function onSubmit(data: FormData) {
    if (hasExpired) {
      setError(`Remove expired item(s) before ordering: ${expiredItems.map((i) => i.name).join(", ")}`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post<CheckoutResponse>("/checkout", {
        email: data.email,
        shipping: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          postcode: data.postcode,
          country: "SG",
        },
        couponCode: data.coupon || undefined,
        notes: data.notes,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.qty,
          price: i.price,
          name: i.name,
        })),
      });

      clearCart();

      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        navigate(`/checkout/success?order=${res.orderId}`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Helmet>
        <title>Checkout — VetMedAgri</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-8">
        {/* Left: customer details */}
        <div className="space-y-5">
          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-3">
              <Field label="Email" error={errors.email?.message}>
                <input {...register("email")} type="email" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" error={errors.firstName?.message}>
                  <input {...register("firstName")} className={inputCls} />
                </Field>
                <Field label="Last Name" error={errors.lastName?.message}>
                  <input {...register("lastName")} className={inputCls} />
                </Field>
              </div>
              <Field label="Phone (optional)">
                <input {...register("phone")} type="tel" className={inputCls} />
              </Field>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Shipping Address</h2>
            <div className="space-y-3">
              <Field label="Address" error={errors.address1?.message}>
                <input {...register("address1")} placeholder="Street address" className={inputCls} />
              </Field>
              <Field label="Unit / Apt (optional)">
                <input {...register("address2")} placeholder="Unit number" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" error={errors.city?.message}>
                  <input {...register("city")} defaultValue="Singapore" className={inputCls} />
                </Field>
                <Field label="Postal Code" error={errors.postcode?.message}>
                  <input {...register("postcode")} className={inputCls} />
                </Field>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Additional</h2>
            <div className="space-y-3">
              <Field label="Coupon Code">
                <input {...register("coupon")} placeholder="Optional" className={inputCls} />
              </Field>
              <Field label="Order Notes">
                <textarea {...register("notes")} rows={3} className={inputCls} />
              </Field>
            </div>
          </section>
        </div>

        {/* Right: order summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-20">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex gap-3 text-sm">
                  {item.image && (
                    <img src={item.image} alt="" className="w-12 h-12 object-contain rounded border border-gray-50 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 line-clamp-1">{item.name}</p>
                    <p className="text-gray-400 text-xs">×{item.qty}</p>
                    {isExpired(item.expiryDate) && (
                      <p className="text-red-600 text-xs font-semibold">Expired — remove to continue</p>
                    )}
                  </div>
                  <span className="text-gray-700 font-medium flex-shrink-0">
                    S${(item.price * item.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>S${total().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>S${total().toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || hasExpired}
              className="mt-4 w-full bg-brand text-white py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Placing order…" : hasExpired ? "Remove expired items" : "Place Order"}
            </button>

            <p className="text-xs text-gray-400 text-center mt-2">
              Payment powered by HitPay (Visa/Mastercard/PayNow)
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
