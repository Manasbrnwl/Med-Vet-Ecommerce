import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Button, Field, Input, Card, Empty } from "../components/ui";
import { api, ApiError } from "../api/client";
import { useAuthStore } from "../store/auth";
import { useCartStore, bonusFreeUnits } from "../store/cart";
import type { Profile, CheckoutResponse } from "../api/types";
import { colors, money, decode } from "../theme";

export default function Checkout() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const clearCart = useCartStore((s) => s.clearCart);

  const { data: me } = useQuery<Profile>({
    queryKey: ["me"],
    queryFn: () => api.get<Profile>("/account/me"),
    enabled: !!token,
  });

  const [f, setF] = useState({
    email: "", firstName: "", lastName: "", phone: "",
    address1: "", address2: "", city: "Singapore", postcode: "", coupon: "", notes: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<number | null>(null);

  useEffect(() => {
    if (!me) return;
    const addr = me.addresses?.find((a) => a.type === "SHIPPING" && a.isDefault) ?? me.addresses?.[0];
    setF((p) => ({
      ...p,
      email: me.email ?? p.email,
      firstName: addr?.firstName ?? me.firstName ?? p.firstName,
      lastName: addr?.lastName ?? me.lastName ?? p.lastName,
      phone: addr?.phone ?? me.phone ?? p.phone,
      address1: addr?.address1 ?? p.address1,
      address2: addr?.address2 ?? p.address2,
      city: addr?.city ?? p.city,
      postcode: addr?.postcode ?? p.postcode,
    }));
  }, [me]);

  // Guest gate
  if (!token) {
    return (
      <Screen>
        <Empty
          title="Sign in to check out"
          subtitle="You need an account to place an order."
          action={
            <View style={{ marginTop: 14, gap: 10, alignSelf: "stretch" }}>
              <Button title="Sign in" onPress={() => router.push("/auth/login" as Href)} />
              <Button title="Create account" variant="outline" onPress={() => router.push("/auth/register" as Href)} />
            </View>
          }
        />
      </Screen>
    );
  }

  if (placed != null) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={s.successTitle}>Order placed!</Text>
          <Text style={s.muted}>Your order #{placed} is confirmed and pending.</Text>
          <View style={s.soon}>
            <Ionicons name="time-outline" size={16} color="#92400e" />
            <Text style={s.soonText}>Online payment is coming soon — our team will follow up to arrange payment.</Text>
          </View>
          <View style={{ gap: 10, alignSelf: "stretch", marginTop: 16 }}>
            <Button title="View my orders" onPress={() => router.replace("/account/orders" as Href)} />
            <Button title="Continue shopping" variant="outline" onPress={() => router.replace("/(tabs)/shop" as Href)} />
          </View>
        </View>
      </Screen>
    );
  }

  if (items.length === 0) {
    return <Screen><Empty title="Your cart is empty" /></Screen>;
  }

  async function place() {
    if (!f.email.trim() || !f.firstName.trim() || !f.address1.trim() || !f.postcode.trim()) {
      setError("Please fill in email, name, address and postcode.");
      return;
    }
    setError(null);
    setPlacing(true);
    try {
      const shipping = {
        firstName: f.firstName, lastName: f.lastName, phone: f.phone || undefined,
        address1: f.address1, address2: f.address2 || undefined, city: f.city, postcode: f.postcode, country: "SG",
        email: f.email,
      };
      const res = await api.post<CheckoutResponse>("/checkout", {
        items: items.map((i) => ({ productId: i.productId, ...(i.variantId ? { variantId: i.variantId } : {}), qty: i.qty })),
        billing: shipping,
        shipping,
        couponCode: f.coupon || undefined,
        customerEmail: f.email.trim().toLowerCase(),
        customerNote: f.notes || undefined,
      });
      clearCart();
      setPlaced(res.orderId);
    } catch (e) {
      setError((e as ApiError).message || "Could not place order.");
    } finally {
      setPlacing(false);
    }
  }

  const freeTotal = items.reduce((n, i) => n + bonusFreeUnits(i), 0);

  return (
    <Screen scroll>
      <Text style={s.h}>Delivery details</Text>
      <Card>
        <Field label="Email"><Input value={f.email} onChangeText={(v) => set("email", v)} autoCapitalize="none" keyboardType="email-address" /></Field>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="First name"><Input value={f.firstName} onChangeText={(v) => set("firstName", v)} /></Field></View>
          <View style={{ flex: 1 }}><Field label="Last name"><Input value={f.lastName} onChangeText={(v) => set("lastName", v)} /></Field></View>
        </View>
        <Field label="Phone"><Input value={f.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" /></Field>
        <Field label="Address"><Input value={f.address1} onChangeText={(v) => set("address1", v)} /></Field>
        <Field label="Unit / Apt (optional)"><Input value={f.address2} onChangeText={(v) => set("address2", v)} /></Field>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 2 }}><Field label="City"><Input value={f.city} onChangeText={(v) => set("city", v)} /></Field></View>
          <View style={{ flex: 1 }}><Field label="Postcode"><Input value={f.postcode} onChangeText={(v) => set("postcode", v)} keyboardType="number-pad" /></Field></View>
        </View>
      </Card>

      <Text style={s.h}>Order</Text>
      <Card>
        {items.map((i) => {
          const free = bonusFreeUnits(i);
          return (
            <View key={`${i.productId}-${i.variantId}`} style={{ marginBottom: 8 }}>
              <View style={s.rowBetween}>
                <Text style={s.item} numberOfLines={1}>{decode(i.name)} ×{i.qty}</Text>
                <Text style={s.item}>{money(i.price * i.qty)}</Text>
              </View>
              {free > 0 ? <Text style={s.free}>+{free} free (bonus)</Text> : null}
            </View>
          );
        })}
        <Field label="Coupon (optional)"><Input value={f.coupon} onChangeText={(v) => set("coupon", v)} autoCapitalize="characters" /></Field>
        <Field label="Order notes (optional)"><Input value={f.notes} onChangeText={(v) => set("notes", v)} multiline /></Field>
        {freeTotal > 0 ? (
          <View style={s.rowBetween}><Text style={s.free}>Free bonus units</Text><Text style={s.free}>{freeTotal}</Text></View>
        ) : null}
        <View style={[s.rowBetween, { marginTop: 8 }]}>
          <Text style={s.total}>Total</Text>
          <Text style={s.total}>{money(total())}</Text>
        </View>
      </Card>

      {error ? <Text style={s.err}>{error}</Text> : null}
      <Button title={placing ? "Placing order…" : "Place order"} onPress={place} disabled={placing} style={{ marginTop: 14 }} />
      <Text style={s.note}>Online payment coming soon — orders are placed as pending.</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 13, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  item: { fontSize: 14, color: colors.text, flexShrink: 1 },
  free: { fontSize: 12, fontWeight: "700", color: colors.success, marginTop: 2 },
  total: { fontSize: 16, fontWeight: "800", color: colors.text },
  err: { color: colors.danger, marginTop: 12, fontWeight: "600", textAlign: "center" },
  note: { color: colors.faint, fontSize: 12, textAlign: "center", marginTop: 10 },
  successTitle: { fontSize: 22, fontWeight: "900", color: colors.text },
  muted: { color: colors.muted, textAlign: "center" },
  soon: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#fef3c7", borderRadius: 12, padding: 12, marginTop: 14 },
  soonText: { flex: 1, color: "#92400e", fontSize: 13, fontWeight: "600" },
});
