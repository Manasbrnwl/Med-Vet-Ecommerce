import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import type { AuthUser } from "../store/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/auth/reset-confirm", { token, password });
      setAuth(res.token, res.user);
      navigate("/account", { replace: true });
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? "This reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Helmet><title>Reset Password — VedMedAgri</title></Helmet>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Choose a new password</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Enter a new password for your account.</p>

        {!token && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 mb-4">
            This link is missing its token. Please use the link from your email, or{" "}
            <Link to="/login?reset=1" className="font-medium underline">request a new one</Link>.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 bg-white border border-gray-100 rounded-2xl p-6">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New password (min 8 characters)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Confirm password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-brand text-white py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Saving…" : "Set new password"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          <Link to="/login" className="text-brand hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
