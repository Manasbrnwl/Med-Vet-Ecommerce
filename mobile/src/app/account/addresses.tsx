import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Button, Field, Input, Loading, ErrorView, Card, Empty } from "../../components/ui";
import { api, ApiError } from "../../api/client";
import type { Profile, Address, AddressType } from "../../api/types";
import { colors } from "../../theme";

type Form = Partial<Address> & { type: AddressType };
const empty: Form = { type: "SHIPPING", isDefault: false, country: "SG" };

export default function AddressesScreen() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery<Profile>({
    queryKey: ["me"],
    queryFn: () => api.get<Profile>("/account/me"),
  });
  const [form, setForm] = useState<Form | null>(null);

  const saveMut = useMutation({
    mutationFn: (f: Form) =>
      f.id ? api.put<Address>(`/account/addresses/${f.id}`, f) : api.post<Address>("/account/addresses", f),
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const delMut = useMutation({
    mutationFn: (id: number) => api.delete(`/account/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  if (isLoading) return <Screen><Loading /></Screen>;
  if (isError) return <Screen><ErrorView message={(error as ApiError)?.message} onRetry={refetch} /></Screen>;

  const addresses = data?.addresses ?? [];

  if (form) {
    const set = (k: keyof Form, v: unknown) => setForm({ ...form, [k]: v });
    return (
      <Screen scroll>
        <View style={s.typeRow}>
          {(["SHIPPING", "BILLING"] as AddressType[]).map((t) => (
            <Pressable key={t} onPress={() => set("type", t)} style={[s.typeChip, form.type === t && s.typeChipOn]}>
              <Text style={[s.typeText, form.type === t && { color: "#fff" }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="First name"><Input value={form.firstName ?? ""} onChangeText={(v) => set("firstName", v)} /></Field></View>
          <View style={{ flex: 1 }}><Field label="Last name"><Input value={form.lastName ?? ""} onChangeText={(v) => set("lastName", v)} /></Field></View>
        </View>
        <Field label="Address line 1"><Input value={form.address1 ?? ""} onChangeText={(v) => set("address1", v)} /></Field>
        <Field label="Address line 2"><Input value={form.address2 ?? ""} onChangeText={(v) => set("address2", v)} /></Field>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 2 }}><Field label="City"><Input value={form.city ?? ""} onChangeText={(v) => set("city", v)} /></Field></View>
          <View style={{ flex: 1 }}><Field label="Postcode"><Input value={form.postcode ?? ""} onChangeText={(v) => set("postcode", v)} keyboardType="number-pad" /></Field></View>
        </View>
        <Field label="Phone"><Input value={form.phone ?? ""} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" /></Field>
        <Pressable style={s.defaultRow} onPress={() => set("isDefault", !form.isDefault)}>
          <Ionicons name={form.isDefault ? "checkbox" : "square-outline"} size={20} color={colors.brand} />
          <Text style={s.defaultText}>Set as default {form.type.toLowerCase()} address</Text>
        </Pressable>
        {saveMut.isError ? <Text style={s.err}>{(saveMut.error as ApiError)?.message}</Text> : null}
        <Button title={saveMut.isPending ? "Saving…" : "Save address"} onPress={() => saveMut.mutate(form)} disabled={saveMut.isPending} style={{ marginTop: 8 }} />
        <Button title="Cancel" variant="outline" onPress={() => setForm(null)} style={{ marginTop: 10 }} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {addresses.length === 0 ? (
        <Empty title="No addresses yet" subtitle="Add one to speed up checkout." />
      ) : (
        addresses.map((a) => (
          <Card key={a.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={s.badge}>{a.type}</Text>
              {a.isDefault ? <Text style={s.default}>Default</Text> : null}
              <Pressable onPress={() => setForm({ ...a })} style={{ marginLeft: "auto", padding: 4 }}>
                <Ionicons name="create-outline" size={18} color={colors.brand} />
              </Pressable>
              <Pressable onPress={() => delMut.mutate(a.id)} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={18} color={colors.faint} />
              </Pressable>
            </View>
            <Text style={s.name}>{[a.firstName, a.lastName].filter(Boolean).join(" ")}</Text>
            <Text style={s.line}>{[a.address1, a.address2, a.city, a.postcode, a.country].filter(Boolean).join(", ")}</Text>
            {a.phone ? <Text style={s.line}>{a.phone}</Text> : null}
          </Card>
        ))
      )}
      <Button title="Add address" onPress={() => setForm({ ...empty })} style={{ marginTop: 6 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  typeChipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  typeText: { fontWeight: "700", color: colors.muted },
  defaultRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 6 },
  defaultText: { color: colors.text, fontWeight: "600" },
  badge: { fontSize: 11, fontWeight: "800", color: colors.brand, backgroundColor: colors.successBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  default: { marginLeft: 8, fontSize: 11, fontWeight: "700", color: colors.success },
  name: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 8 },
  line: { fontSize: 13, color: colors.muted, marginTop: 2 },
  err: { color: colors.danger, marginTop: 8, fontWeight: "600" },
});
