import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "reset">(searchParams.get("reset") === "1" ? "reset" : "login");

  const from = (location.state as { from?: string })?.from ?? "/account";

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError("");
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", data);
      setAuth(res.token, res.user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 403) {
        setResetEmail(data.email);
        setMode("reset");
        setError("");
      } else {
        setError(e.message ?? "Login failed");
      }
    }
  }

  // ── Reset flow (email a link) ─────────────────────────────────────────────────
  const [resetEmail, setResetEmail] = useState(getValues("email") ?? "");
  const [resetErr, setResetErr] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setResetErr("");
    if (!/^\S+@\S+\.\S+$/.test(resetEmail)) { setResetErr("Enter a valid email."); return; }
    setResetLoading(true);
    try {
      await api.post("/auth/reset-request", { email: resetEmail.trim().toLowerCase() });
      setResetSent(true);
    } catch (err: unknown) {
      setResetErr((err as { message?: string }).message ?? "Couldn’t send the reset email. Please try again.");
    } finally {
      setResetLoading(false);
    }
  }

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Helmet><title>{mode === "reset" ? "Reset Password" : "Sign In"} — VedMedAgri</title></Helmet>
      <div className="w-full max-w-sm">
        {mode === "reset" ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Reset your password</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter your email and we'll send you a link to set a new password.
            </p>

            {resetSent ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl px-5 py-6 text-center">
                <p className="font-semibold mb-1">Check your email</p>
                <p>If an account exists for <strong>{resetEmail}</strong>, a reset link is on its way. The link is valid for 1 hour.</p>
              </div>
            ) : (
              <>
                {resetErr && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{resetErr}</div>
                )}
                <form onSubmit={onReset} className="space-y-4 bg-white border border-gray-100 rounded-2xl p-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className={inputCls} />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-brand text-white py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
                  >
                    {resetLoading ? "Sending…" : "Send reset link"}
                  </button>
                </form>
              </>
            )}

            <p className="text-sm text-gray-500 text-center mt-4">
              <button onClick={() => { setMode("login"); setResetSent(false); }} className="text-brand hover:underline">Back to sign in</button>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Sign In</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              New customer?{" "}
              <Link to="/register" className="text-brand hover:underline">Create an account</Link>
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white border border-gray-100 rounded-2xl p-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input {...register("email")} type="email" className={inputCls} />
                {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input {...register("password")} type="password" className={inputCls} />
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

            <p className="text-sm text-gray-500 text-center mt-4">
              Migrated from the old site?{" "}
              <button onClick={() => setMode("reset")} className="text-brand hover:underline">Reset your password</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
