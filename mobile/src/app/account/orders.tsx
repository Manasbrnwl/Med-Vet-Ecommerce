import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Loading, ErrorView, Empty, Card } from "../../components/ui";
import { api, ApiError } from "../../api/client";
import type { OrderSummary, ListMeta } from "../../api/types";
import { colors, money, statusColor, decode } from "../../theme";

interface OrdersResponse {
  data: OrderSummary[];
  meta: ListMeta;
}

export default function Orders() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<OrdersResponse>({
    queryKey: ["orders"],
    queryFn: () => api.get<OrdersResponse>("/account/orders?limit=50"),
  });

  if (isLoading) return <Screen><Loading /></Screen>;
  if (isError) return <Screen><ErrorView message={(error as ApiError)?.message} onRetry={refetch} /></Screen>;

  const orders = data?.data ?? [];
  if (orders.length === 0) {
    return <Screen><Empty title="No orders yet" subtitle="Your placed orders will show up here." /></Screen>;
  }

  return (
    <Screen style={{ padding: 0 }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/orders/${item.id}` as Href)}>
            <Card>
              <View style={s.row}>
                <Text style={s.id}>Order #{item.id}</Text>
                <Text style={[s.status, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
              <Text style={s.meta}>
                {new Date(item.createdAt).toLocaleDateString()} · {item._count.items} item{item._count.items === 1 ? "" : "s"}
              </Text>
              <Text numberOfLines={1} style={s.items}>
                {item.items.map((i) => `${decode(i.name)} ×${i.quantity}`).join(", ")}
              </Text>
              <View style={s.row}>
                <Text style={s.total}>{money(Number(item.total))}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  id: { fontSize: 15, fontWeight: "800", color: colors.text },
  status: { fontSize: 12, fontWeight: "800" },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  items: { fontSize: 13, color: colors.muted, marginTop: 6 },
  total: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 8 },
});
