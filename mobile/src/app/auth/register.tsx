import { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, Link, Href } from "expo-router";
import { Screen, Button, Field, Input } from "../../components/ui";
import { api, ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth";
import type { AuthResponse } from "../../api/types";
import { colors } from "../../theme";

export default function Register() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!firstName.trim() || !email.trim() || password.length < 8) {
      setError("Fill in your name, email, and a password of at least 8 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>("/auth/register", {
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setAuth(res.token, res.user);
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/account" as Href);
    } catch (e) {
      const err = e as ApiError;
      setError(err.status === 409 ? "That email is already registered." : err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={s.title}>Create account</Text>
      <Text style={s.sub}>Join to order and track your purchases.</Text>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="First name">
            <Input value={firstName} onChangeText={setFirstName} placeholder="John" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Last name">
            <Input value={lastName} onChangeText={setLastName} placeholder="Doe" />
          </Field>
        </View>
      </View>
      <Field label="Email">
        <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
      </Field>
      <Field label="Password (min 8 chars)">
        <Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
      </Field>

      <Button title={loading ? "Creating…" : "Create account"} onPress={submit} disabled={loading} />
      {loading ? <ActivityIndicator style={{ marginTop: 10 }} color={colors.brand} /> : null}

      <View style={s.footer}>
        <Text style={s.muted}>Already have an account? </Text>
        <Link href={"/auth/login" as Href} replace>
          <Text style={s.link}>Sign in</Text>
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
