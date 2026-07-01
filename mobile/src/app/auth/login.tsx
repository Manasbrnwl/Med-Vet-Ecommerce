import { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, Link, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Button, Field, Input, Card } from "../../components/ui";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function submitLogin() {
    if (!email.trim() || !password) { setError("Enter your email and password."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>("/auth/login", { email: email.trim().toLowerCase(), password });
      setAuth(res.token, res.user);
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/account" as Href);
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 403) { setMode("reset"); setError(null); }
      else setError(err.status === 401 ? "Invalid email or password." : err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset() {
    if (!email.trim()) { setError("Enter your email."); return; }
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/reset-request", { email: email.trim().toLowerCase() });
      setResetSent(true);
    } catch (e) {
      setError((e as ApiError).message || "Couldn’t send the reset email.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "reset") {
    return (
      <Screen scroll>
        <Text style={s.title}>Reset your password</Text>
        <Text style={s.sub}>Enter your email — we'll send a link to set a new password.</Text>
        {resetSent ? (
          <Card style={{ alignItems: "center", gap: 6, paddingVertical: 22 }}>
            <Ionicons name="mail-outline" size={30} color={colors.success} />
            <Text style={s.sentTitle}>Check your email</Text>
            <Text style={s.sentText}>If an account exists for {email}, a reset link is on its way (valid 1 hour). Open it to set a new password, then sign in.</Text>
          </Card>
        ) : (
          <>
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Field label="Email"><Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" /></Field>
            <Button title={loading ? "Sending…" : "Send reset link"} onPress={submitReset} disabled={loading} />
            {loading ? <ActivityIndicator style={{ marginTop: 10 }} color={colors.brand} /> : null}
          </>
        )}
        <View style={s.footer}>
          <Text style={s.link} onPress={() => { setMode("login"); setResetSent(false); setError(null); }}>Back to sign in</Text>
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
  sentTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  sentText: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19 },
});
