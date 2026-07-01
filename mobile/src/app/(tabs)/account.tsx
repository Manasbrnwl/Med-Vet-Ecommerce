import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Button, Card } from "../../components/ui";
import { colors } from "../../theme";
import { useAuthStore } from "../../store/auth";

export default function Account() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  if (!token) {
    return (
      <Screen>
        <Card>
          <Text style={s.title}>Welcome</Text>
          <Text style={s.muted}>Sign in to manage your profile and see your orders.</Text>
          <Button title="Sign in" onPress={() => router.push("/auth/login" as Href)} style={{ marginTop: 14 }} />
          <Button title="Create account" variant="outline" onPress={() => router.push("/auth/register" as Href)} style={{ marginTop: 10 }} />
        </Card>
      </Screen>
    );
  }

  const rows: { label: string; icon: keyof typeof Ionicons.glyphMap; href: Href }[] = [
    { label: "Profile", icon: "person-outline", href: "/account/profile" as Href },
    { label: "Addresses", icon: "location-outline", href: "/account/addresses" as Href },
    { label: "My orders", icon: "receipt-outline", href: "/account/orders" as Href },
  ];

  return (
    <Screen>
      <Text style={s.hi}>Hi{user?.firstName ? `, ${user.firstName}` : ""}</Text>
      <Text style={s.muted}>{user?.email}</Text>
      <View style={{ marginTop: 16, gap: 10 }}>
        {rows.map((r) => (
          <Pressable key={r.label} onPress={() => router.push(r.href)}>
            <Card style={s.rowCard}>
              <Ionicons name={r.icon} size={20} color={colors.brand} />
              <Text style={s.rowLabel}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} style={{ marginLeft: "auto" }} />
            </Card>
          </Pressable>
        ))}
      </View>
      <Button title="Log out" variant="outline" onPress={clearAuth} style={{ marginTop: 20 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  muted: { fontSize: 14, color: colors.muted, marginTop: 4 },
  hi: { fontSize: 24, fontWeight: "900", color: colors.text },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
});
