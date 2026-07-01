import { Pressable, Text, View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter, Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, money, decode } from "../theme";
import type { ProductSummary } from "../api/types";

export function ProductCard({ product, style }: { product: ProductSummary; style?: object }) {
  const router = useRouter();
  const img = product.images?.[0]?.url ?? null;
  const price = product.price ? Number(product.price) : null;
  const reg = product.regularPrice ? Number(product.regularPrice) : null;
  const onSale = reg != null && price != null && reg > price;
  const oos = product.stockStatus === "OUT_OF_STOCK";

  return (
    <Pressable style={[s.card, style]} onPress={() => router.push(`/product/${product.slug}` as Href)}>
      <View style={s.imgWrap}>
        {img ? (
          <Image source={img} style={s.img} contentFit="contain" transition={150} />
        ) : (
          <View style={s.img} />
        )}
        {product.bonusBuyQty && product.bonusFreeQty ? (
          <View style={s.badge}>
            <Ionicons name="gift" size={10} color="#fff" />
            <Text style={s.badgeText}>{product.bonusBuyQty}+{product.bonusFreeQty}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={s.name}>{decode(product.name)}</Text>
      <View style={s.priceRow}>
        {price != null ? <Text style={s.price}>{money(price)}</Text> : <Text style={s.muted}>—</Text>}
        {onSale ? <Text style={s.reg}>{money(reg!)}</Text> : null}
      </View>
      {oos ? <Text style={s.oos}>Out of stock</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 10 },
  imgWrap: { position: "relative" },
  img: { width: "100%", height: 120, borderRadius: 10, backgroundColor: colors.bg },
  badge: { position: "absolute", top: 6, left: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  name: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 8, minHeight: 34 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  price: { fontSize: 15, fontWeight: "800", color: colors.text },
  reg: { fontSize: 12, color: colors.faint, textDecorationLine: "line-through" },
  muted: { color: colors.muted },
  oos: { fontSize: 11, color: colors.danger, fontWeight: "700", marginTop: 2 },
});
