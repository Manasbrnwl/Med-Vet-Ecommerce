import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Loading, ErrorView, Card } from "../../components/ui";
import { api, ApiError } from "../../api/client";
import type { OrderDetail } from "../../api/types";
import { colors, money, statusColor, decode } from "../../theme";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, error, refetch } = useQuery<OrderDetail>({
    queryKey: ["order", id],
    queryFn: () => api.get<OrderDetail>(`/account/orders/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <Loading />;
  if (isError || !order) return <ErrorView message={(error as ApiError)?.message} onRetry={refetch} />;

  const row = (label: string, value: string, bold?: boolean) => (
    <View style={s.line}>
      <Text style={[s.lLabel, bold && s.bold]}>{label}</Text>
      <Text style={[s.lValue, bold && s.bold]}>{value}</Text>
    </View>
  );

  const addr = order.shipping ?? order.billing;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <View style={s.header}>
          <Text style={s.id}>Order #{order.id}</Text>
          <Text style={[s.status, { color: statusColor(order.status) }]}>{order.status}</Text>
        </View>
        <Text style={s.meta}>{new Date(order.createdAt).toLocaleString()}</Text>
      </Card>

      <Card>
        {order.items.map((it) => {
          const img = it.product?.images?.[0]?.url ?? null;
          return (
            <View key={it.id} style={s.item}>
              {img ? <Image source={img} style={s.img} contentFit="contain" /> : <View style={s.img} />}
              <View style={{ flex: 1 }}>
                <Text style={s.itemName} numberOfLines={2}>{decode(it.name)}</Text>
                <Text style={s.itemMeta}>
                  Qty {it.quantity}{it.bonusQuantity > 0 ? ` (+${it.bonusQuantity} free)` : ""}
                </Text>
              </View>
              <Text style={s.itemTotal}>{money(Number(it.total))}</Text>
            </View>
          );
        })}
      </Card>

      <Card>
        {row("Subtotal", money(Number(order.subtotal)))}
        {Number(order.discountTotal) > 0 ? row("Discount", `−${money(Number(order.discountTotal))}`) : null}
        {row("Shipping", money(Number(order.shippingTotal)))}
        {row("Total", money(Number(order.total)), true)}
      </Card>

      {addr ? (
        <Card>
          <Text style={s.section}>Delivery to</Text>
          <Text style={s.addr}>{[addr.firstName, addr.lastName].filter(Boolean).join(" ")}</Text>
          <Text style={s.addrLine}>{[addr.address1, addr.address2, addr.city, addr.postcode, addr.country].filter(Boolean).join(", ")}</Text>
          {order.customerEmail ? <Text style={s.addrLine}>{order.customerEmail}</Text> : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  id: { fontSize: 17, fontWeight: "900", color: colors.text },
  status: { fontSize: 12, fontWeight: "800" },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  img: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.bg },
  itemName: { fontSize: 14, fontWeight: "600", color: colors.text },
  itemMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: "700", color: colors.text },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  lLabel: { color: colors.muted, fontSize: 14 },
  lValue: { color: colors.text, fontSize: 14 },
  bold: { fontWeight: "800", fontSize: 16 },
  section: { fontSize: 13, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  addr: { fontSize: 15, fontWeight: "700", color: colors.text },
  addrLine: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
