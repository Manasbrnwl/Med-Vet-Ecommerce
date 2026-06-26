import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import type { AuthUser } from "../store/auth";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [needsReset, setNeedsReset] = useState(false);

  const from = (location.state as { from?: string })?.from ?? "/account";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError("");
    setNeedsReset(false);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", data);
      setAuth(res.token, res.user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 403) {
        setNeedsReset(true);
      } else {
        setError(e.message ?? "Login failed");
      }
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Helmet><title>Sign In — VetMedAgri</title></Helmet>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Sign In</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          New customer?{" "}
          <Link to="/register" className="text-brand hover:underline">Create an account</Link>
        </p>

        {needsReset && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 mb-4">
            Your account was migrated from our old site. Please{" "}
            <Link to="/login?reset=1" className="font-medium underline">reset your password</Link>{" "}
            to continue.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white border border-gray-100 rounded-2xl p-6">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              {...register("email")}
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input
              {...register("password")}
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
            {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand text-white py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
