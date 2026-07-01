import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Button, Field, Input, Loading, ErrorView, Card } from "../../components/ui";
import { api, ApiError } from "../../api/client";
import { useAuthStore } from "../../store/auth";
import type { Profile } from "../../api/types";
import { colors } from "../../theme";

export default function ProfileScreen() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const { data, isLoading, isError, error, refetch } = useQuery<Profile>({
    queryKey: ["me"],
    queryFn: () => api.get<Profile>("/account/me"),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setFirstName(data.firstName ?? "");
      setLastName(data.lastName ?? "");
      setPhone(data.phone ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put<Profile>("/account/me", body),
    onSuccess: (u) => {
      setMsg("Saved");
      setCurrentPassword("");
      setNewPassword("");
      setUser({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone, role: u.role });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => setMsg((e as ApiError).message || "Update failed"),
  });

  if (isLoading) return <Screen><Loading /></Screen>;
  if (isError) return <Screen><ErrorView message={(error as ApiError)?.message} onRetry={refetch} /></Screen>;

  function onSave() {
    setMsg(null);
    const body: Record<string, unknown> = { firstName, lastName, phone };
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }
    save.mutate(body);
  }

  return (
    <Screen scroll>
      <Card>
        <Text style={s.email}>{data?.email}</Text>
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="First name"><Input value={firstName} onChangeText={setFirstName} /></Field></View>
          <View style={{ flex: 1 }}><Field label="Last name"><Input value={lastName} onChangeText={setLastName} /></Field></View>
        </View>
        <Field label="Phone"><Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+65 …" /></Field>
      </Card>

      <Text style={s.section}>Change password</Text>
      <Card>
        <Field label="Current password"><Input value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry /></Field>
        <Field label="New password (min 8)"><Input value={newPassword} onChangeText={setNewPassword} secureTextEntry /></Field>
      </Card>

      {msg ? <Text style={[s.msg, msg === "Saved" ? { color: colors.success } : { color: colors.danger }]}>{msg}</Text> : null}
      <Button title={save.isPending ? "Saving…" : "Save changes"} onPress={onSave} disabled={save.isPending} style={{ marginTop: 14 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  email: { fontSize: 15, fontWeight: "700", color: colors.text },
  section: { fontSize: 13, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  msg: { textAlign: "center", marginTop: 12, fontWeight: "700" },
});
