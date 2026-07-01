import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Button, Empty, Card } from "../../components/ui";
import { colors, money, decode } from "../../theme";
import { useCartStore, bonusFreeUnits, CartItem } from "../../store/cart";

export default function Cart() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = useCartStore((s) => s.total);
  const freeTotal = useCartStore((s) => s.freeTotal);

  if (items.length === 0) {
    return (
      <Screen>
        <Empty
          title="Your cart is empty"
          subtitle="Add products to get started."
          action={<Button title="Browse products" onPress={() => router.push("/shop")} style={{ marginTop: 14 }} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(i) => `${i.productId}-${i.variantId}`}
        contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
        renderItem={({ item }) => <Row item={item} onQty={updateQty} onRemove={removeItem} />}
        ListFooterComponent={
          <Card style={{ marginTop: 8 }}>
            {freeTotal() > 0 ? (
              <View style={s.rowBetween}>
                <Text style={s.freeLabel}>Free bonus units</Text>
                <Text style={s.freeLabel}>{freeTotal()}</Text>
              </View>
            ) : null}
            <View style={[s.rowBetween, { marginTop: 6 }]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalLabel}>{money(total())}</Text>
            </View>
            <Button title="Proceed to checkout" onPress={() => router.push("/checkout")} style={{ marginTop: 14 }} />
          </Card>
        }
      />
    </Screen>
  );
}

function Row({
  item,
  onQty,
  onRemove,
}: {
  item: CartItem;
  onQty: (p: number, v: number | null, q: number) => void;
  onRemove: (p: number, v: number | null) => void;
}) {
  const free = bonusFreeUnits(item);
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {item.image ? (
          <Image source={item.image} style={s.img} contentFit="contain" />
        ) : (
          <View style={s.img} />
        )}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={s.name}>{decode(item.name)}</Text>
          <Text style={s.price}>{money(item.price)}</Text>
          {item.bonusBuyQty && item.bonusFreeQty ? (
            free > 0 ? (
              <Text style={s.bonusOn}>+{free} free — you get {item.qty + free} total</Text>
            ) : (
              <Text style={s.bonusHint}>Buy {item.bonusBuyQty}, get {item.bonusFreeQty} free</Text>
            )
          ) : null}
          <View style={s.qtyRow}>
            <Pressable style={s.qtyBtn} onPress={() => onQty(item.productId, item.variantId, item.qty - 1)}>
              <Ionicons name="remove" size={16} color={colors.text} />
            </Pressable>
            <Text style={s.qty}>{item.qty}</Text>
            <Pressable style={s.qtyBtn} onPress={() => onQty(item.productId, item.variantId, item.qty + 1)}>
              <Ionicons name="add" size={16} color={colors.text} />
            </Pressable>
            <Text style={s.lineTotal}>{money(item.price * item.qty)}</Text>
            <Pressable onPress={() => onRemove(item.productId, item.variantId)} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={18} color={colors.faint} />
            </Pressable>
          </View>
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  img: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.bg },
  name: { fontSize: 14, fontWeight: "600", color: colors.text },
  price: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 },
  bonusOn: { fontSize: 12, fontWeight: "700", color: colors.success, marginTop: 3 },
  bonusHint: { fontSize: 12, fontWeight: "600", color: colors.success, marginTop: 3 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  qty: { fontSize: 14, fontWeight: "700", minWidth: 20, textAlign: "center" },
  lineTotal: { marginLeft: "auto", fontSize: 14, fontWeight: "700", color: colors.text },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  freeLabel: { fontSize: 13, fontWeight: "700", color: colors.success },
  totalLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
});
