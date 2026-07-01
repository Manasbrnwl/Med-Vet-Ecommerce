import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const icon = <Ionicons name={filled ? "star" : "star-outline"} size={size} color="#f59e0b" />;
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>{icon}</Pressable>
        ) : (
          <View key={n}>{icon}</View>
        );
      })}
    </View>
  );
}

export function Screen({ children, scroll, style }: { children: ReactNode; scroll?: boolean; style?: ViewStyle }) {
  const inner = scroll ? (
    <ScrollView contentContainerStyle={[{ padding: 16 }, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: 16 }, style]}>{children}</View>
  );
  return <SafeAreaView style={s.screen} edges={["top"]}>{inner}</SafeAreaView>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.brand} />
      {label ? <Text style={s.muted}>{label}</Text> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={s.errTitle}>Something went wrong</Text>
      <Text style={s.muted}>{message ?? "Please try again."}</Text>
      {onRetry ? <Button title="Retry" onPress={onRetry} style={{ marginTop: 12 }} /> : null}
    </View>
  );
}

export function Empty({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={s.center}>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

export function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline";
  style?: ViewStyle;
}) {
  const outline = variant === "outline";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        outline ? s.btnOutline : s.btnPrimary,
        (disabled || pressed) && { opacity: 0.6 },
        style,
      ]}
    >
      <Text style={[s.btnText, outline && { color: colors.brand }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, error, children }: { label?: string; error?: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      {children}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.faint} {...props} style={[s.input, props.style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 6 },
  muted: { color: colors.muted, fontSize: 14, textAlign: "center" },
  errTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  btn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, alignItems: "center" },
  btnPrimary: { backgroundColor: colors.brand },
  btnOutline: { borderWidth: 1, borderColor: colors.brand, backgroundColor: "transparent" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
});
