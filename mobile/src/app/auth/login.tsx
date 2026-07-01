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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>("/auth/login", { email: email.trim().toLowerCase(), password });
      setAuth(res.token, res.user);
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/account" as Href);
    } catch (e) {
      const err = e as ApiError;
      setError(
        err.status === 403
          ? "This account was migrated from the old site — please reset your password on the website first."
          : err.status === 401
          ? "Invalid email or password."
          : err.message || "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={s.title}>Welcome back</Text>
      <Text style={s.sub}>Sign in to place orders and view your history.</Text>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <Field label="Email">
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Password">
        <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
      </Field>

      <Button title={loading ? "Signing in…" : "Sign in"} onPress={submit} disabled={loading} />
      {loading ? <ActivityIndicator style={{ marginTop: 10 }} color={colors.brand} /> : null}

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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  muted: { color: colors.muted },
  link: { color: colors.brand, fontWeight: "700" },
});
