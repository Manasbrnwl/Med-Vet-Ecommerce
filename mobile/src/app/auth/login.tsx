import { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, Link, Href } from "expo-router";
import { Screen, Button, Field, Input } from "../../components/ui";
import { api, ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth";
import type { AuthResponse } from "../../api/types";
import { colors } from "../../theme";

export default function Login() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function done(res: AuthResponse) {
    setAuth(res.token, res.user);
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/account" as Href);
  }

  async function submitLogin() {
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setError(null);
    setLoading(true);
    try {
      done(await api.post<AuthResponse>("/auth/login", { email: email.trim().toLowerCase(), password }));
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 403) {
        setMode("reset");
        setError(null);
      } else {
        setError(err.status === 401 ? "Invalid email or password." : err.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitReset() {
    if (!email.trim()) { setError("Enter your email."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(null);
    setLoading(true);
    try {
      const rr = await api.post<{ dev_token?: string }>("/auth/reset-request", { email: email.trim().toLowerCase() });
      if (!rr.dev_token) { setError("Couldn’t start a reset for that email. Contact support."); return; }
      done(await api.post<AuthResponse>("/auth/reset-confirm", { token: rr.dev_token, password: newPassword }));
    } catch (e) {
      setError((e as ApiError).message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "reset") {
    return (
      <Screen scroll>
        <Text style={s.title}>Reset your password</Text>
        <Text style={s.sub}>Accounts from our old site need a new password. Set one to sign in.</Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Field label="Email"><Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" /></Field>
        <Field label="New password (min 8)"><Input value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="••••••••" /></Field>
        <Button title={loading ? "Setting password…" : "Set password & sign in"} onPress={submitReset} disabled={loading} />
        {loading ? <ActivityIndicator style={{ marginTop: 10 }} color={colors.brand} /> : null}
        <View style={s.footer}>
          <Text style={s.muted}>Remembered it? </Text>
          <Text style={s.link} onPress={() => { setMode("login"); setError(null); }}>Back to sign in</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={s.title}>Welcome back</Text>
      <Text style={s.sub}>Sign in to place orders and view your history.</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Field label="Email"><Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" /></Field>
      <Field label="Password"><Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" /></Field>
      <Button title={loading ? "Signing in…" : "Sign in"} onPress={submitLogin} disabled={loading} />
      {loading ? <ActivityIndicator style={{ marginTop: 10 }} color={colors.brand} /> : null}
      <View style={s.footer}>
        <Text style={s.muted}>Migrated from the old site? </Text>
        <Text style={s.link} onPress={() => { setMode("reset"); setError(null); }}>Reset password</Text>
      </View>
      <View style={s.footer}>
        <Text style={s.muted}>New here? </Text>
        <Link href={"/auth/register" as Href} replace>
          <Text style={s.link}>Create an account</Text>
        </Link>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "900", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 20 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  muted: { color: colors.muted },
  link: { color: colors.brand, fontWeight: "700" },
});
