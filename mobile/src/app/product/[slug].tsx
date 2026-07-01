import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loading, ErrorView, Button, Stars, Input } from "../../components/ui";
import { api, ApiError } from "../../api/client";
import type { ProductDetail, ProductVariant } from "../../api/types";
import { useCartStore } from "../../store/cart";
import { useAuthStore } from "../../store/auth";
import { colors, money, decode } from "../../theme";

interface Eligibility {
  canReview: boolean;
  mine: { id: number; rating: number; content: string | null } | null;
}

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading, isError, error, refetch } = useQuery<ProductDetail>({
    queryKey: ["product", slug],
    queryFn: () => api.get<ProductDetail>(`/products/${slug}`),
    enabled: !!slug,
  });

  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [myRating, setMyRating] = useState(5);
  const [myContent, setMyContent] = useState("");

  const elig = useQuery<Eligibility>({
    queryKey: ["review-elig", product?.id],
    queryFn: () => api.get<Eligibility>(`/account/reviews/eligibility/${product!.id}`),
    enabled: !!token && !!product?.id,
  });

  const submitReview = useMutation({
    mutationFn: () => api.post("/account/reviews", { productId: product!.id, rating: myRating, content: myContent || null }),
    onSuccess: () => {
      setReviewOpen(false);
      qc.invalidateQueries({ queryKey: ["product", slug] });
      qc.invalidateQueries({ queryKey: ["review-elig", product?.id] });
    },
  });

  function openReview() {
    const mine = elig.data?.mine;
    setMyRating(mine?.rating ?? 5);
    setMyContent(mine?.content ?? "");
    setReviewOpen(true);
  }

  const imgs = useMemo(() => {
    const base = product?.images?.map((i) => i.url) ?? [];
    return variant?.imageUrl ? [variant.imageUrl, ...base.filter((u) => u !== variant.imageUrl)] : base;
  }, [product, variant]);

  if (isLoading) return <Loading />;
  if (isError || !product) return <ErrorView message={(error as ApiError)?.message} onRetry={refetch} />;

  const price = Number(variant?.price ?? product.price ?? 0);
  const reg = variant?.regularPrice ?? product.regularPrice;
  const onSale = reg != null && Number(reg) > price;
  const stockStatus = variant?.stockStatus ?? product.stockStatus;
  const inStock = stockStatus !== "OUT_OF_STOCK";
  const needsVariant = product.variants.length > 0 && !variant;
  const free = product.bonusBuyQty && product.bonusFreeQty ? Math.floor(qty / product.bonusBuyQty) * product.bonusFreeQty : 0;

  function add() {
    if (!inStock || needsVariant) return;
    const label =
      decode(product!.name) + (variant ? ` (${variant.attributes.map((a) => a.attributeValue.value).join(", ")})` : "");
    addItem({
      productId: product!.id,
      variantId: variant?.id ?? null,
      slug: product!.slug,
      name: label,
      price,
      image: imgs[0] ?? null,
      sku: variant?.sku ?? product!.sku,
      bonusBuyQty: product!.bonusBuyQty,
      bonusFreeQty: product!.bonusFreeQty,
      qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {imgs.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {imgs.map((u, i) => (
                <Image key={i} source={u} style={{ width, height: width * 0.9, backgroundColor: colors.card }} contentFit="contain" transition={150} />
              ))}
            </ScrollView>
            {imgs.length > 1 ? (
              <View style={s.countBadge}>
                <Ionicons name="images-outline" size={12} color="#fff" />
                <Text style={s.countText}>{imgIndex + 1}/{imgs.length}</Text>
              </View>
            ) : null}
            {imgs.length > 1 && imgs.length <= 8 ? (
              <View style={s.dots} pointerEvents="none">
                {imgs.map((_, i) => (
                  <View key={i} style={[s.dot, i === imgIndex && s.dotOn]} />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ width, height: width * 0.9, backgroundColor: colors.card }} />
        )}

        <View style={s.body}>
          {product.brand ? <Text style={s.brand}>{product.brand.name}</Text> : null}
          <Text style={s.name}>{decode(product.name)}</Text>

          <View style={s.priceRow}>
            <Text style={s.price}>{money(price)}</Text>
            {onSale ? <Text style={s.reg}>{money(Number(reg))}</Text> : null}
          </View>
          <Text style={[s.stock, { color: inStock ? colors.success : colors.danger }]}>
            {inStock ? "In stock" : "Out of stock"}
          </Text>

          {product.bonusBuyQty && product.bonusFreeQty ? (
            <View style={s.bonus}>
              <Ionicons name="gift" size={16} color={colors.success} />
              <Text style={s.bonusText}>
                Bulk bonus: buy {product.bonusBuyQty}, get {product.bonusFreeQty} free
                {free > 0 ? ` — you'll get ${free} free (${qty + free} total)` : ""}
              </Text>
            </View>
          ) : null}

          {product.variants.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Text style={s.section}>Options</Text>
              <View style={s.variantWrap}>
                {product.variants.map((v) => {
                  const active = variant?.id === v.id;
                  const label = v.attributes.map((a) => a.attributeValue.value).join(" / ") || v.sku || `#${v.id}`;
                  return (
                    <Pressable key={v.id} onPress={() => { setVariant(active ? null : v); setImgIndex(0); }} style={[s.variant, active && s.variantOn]}>
                      <Text style={[s.variantText, active && { color: "#fff" }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {needsVariant ? <Text style={s.hint}>Select an option to continue.</Text> : null}
            </View>
          ) : null}

          {product.shortDescription ? (
            <View style={{ marginTop: 18 }}>
              <Text style={s.section}>Overview</Text>
              <Text style={s.desc}>{product.shortDescription.replace(/<[^>]+>/g, "").trim()}</Text>
            </View>
          ) : null}

          {/* Reviews */}
          <View style={{ marginTop: 24 }}>
            <View style={s.reviewHead}>
              <Text style={s.section}>Reviews</Text>
              {product.reviewSummary.count > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Stars value={product.reviewSummary.avg ?? 0} />
                  <Text style={s.summaryText}>{product.reviewSummary.avg} ({product.reviewSummary.count})</Text>
                </View>
              ) : null}
            </View>

            {product.reviews.length === 0 ? (
              <Text style={s.noReviews}>No reviews yet.</Text>
            ) : (
              product.reviews.map((r) => (
                <View key={r.id} style={s.reviewCard}>
                  <View style={s.reviewRow}>
                    <Text style={s.reviewAuthor}>{r.authorName ?? "Customer"}</Text>
                    <Stars value={r.rating ?? 0} size={12} />
                  </View>
                  {r.content ? <Text style={s.reviewText}>{r.content.replace(/<[^>]+>/g, "").trim()}</Text> : null}
                  <Text style={s.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
              ))
            )}

            {!token ? (
              <Text style={s.hintMuted}>Sign in to leave a review.</Text>
            ) : elig.data?.canReview ? (
              reviewOpen ? (
                <View style={s.reviewForm}>
                  <Text style={s.section}>Your rating</Text>
                  <Stars value={myRating} size={30} onChange={setMyRating} />
                  <Input value={myContent} onChangeText={setMyContent} placeholder="Share your experience…" multiline style={{ marginTop: 10, minHeight: 84 }} />
                  {submitReview.isError ? <Text style={s.hint}>{(submitReview.error as ApiError)?.message}</Text> : null}
                  <Button title={submitReview.isPending ? "Submitting…" : "Submit review"} onPress={() => submitReview.mutate()} disabled={submitReview.isPending} style={{ marginTop: 12 }} />
                  <Button title="Cancel" variant="outline" onPress={() => setReviewOpen(false)} style={{ marginTop: 8 }} />
                </View>
              ) : (
                <Button title={elig.data.mine ? "Edit your review" : "Write a review"} variant="outline" onPress={openReview} style={{ marginTop: 14 }} />
              )
            ) : (
              <Text style={s.hintMuted}>Only verified buyers can review this product.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={s.bar}>
        <View style={s.stepper}>
          <Pressable onPress={() => setQty(Math.max(1, qty - 1))} style={s.stepBtn}><Ionicons name="remove" size={18} color={colors.text} /></Pressable>
          <Text style={s.qty}>{qty}</Text>
          <Pressable onPress={() => setQty(qty + 1)} style={s.stepBtn}><Ionicons name="add" size={18} color={colors.text} /></Pressable>
        </View>
        <Button
          title={added ? "Added ✓" : !inStock ? "Out of stock" : needsVariant ? "Select an option" : "Add to cart"}
          onPress={add}
          disabled={!inStock || needsVariant}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  body: { padding: 16 },
  brand: { fontSize: 12, fontWeight: "700", color: colors.brand, textTransform: "uppercase", letterSpacing: 0.5 },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  price: { fontSize: 24, fontWeight: "900", color: colors.text },
  reg: { fontSize: 16, color: colors.faint, textDecorationLine: "line-through" },
  stock: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  bonus: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.successBg, borderWidth: 1, borderColor: "#a7f3d0", borderRadius: 12, padding: 12, marginTop: 14 },
  bonusText: { flex: 1, fontSize: 13, fontWeight: "700", color: "#065f46" },
  section: { fontSize: 13, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  variantWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variant: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  variantOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  variantText: { fontSize: 13, fontWeight: "600", color: colors.text },
  hint: { color: colors.danger, fontSize: 12, marginTop: 6, fontWeight: "600" },
  desc: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  stepBtn: { padding: 10 },
  qty: { fontSize: 15, fontWeight: "800", minWidth: 28, textAlign: "center" },
  reviewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  summaryText: { fontSize: 13, fontWeight: "700", color: colors.text },
  noReviews: { fontSize: 14, color: colors.muted },
  reviewCard: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12 },
  reviewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewAuthor: { fontSize: 14, fontWeight: "700", color: colors.text },
  reviewText: { fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 6 },
  reviewDate: { fontSize: 11, color: colors.faint, marginTop: 6 },
  hintMuted: { fontSize: 13, color: colors.muted, marginTop: 12, fontStyle: "italic" },
  reviewForm: { marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14 },
  countBadge: { position: "absolute", top: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(15,23,42,0.72)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  countText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  dots: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(15,23,42,0.22)" },
  dotOn: { backgroundColor: colors.brand, width: 20 },
});
