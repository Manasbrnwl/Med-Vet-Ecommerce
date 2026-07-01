import { View, Text, StyleSheet, FlatList, Pressable, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Loading, ErrorView } from "../../components/ui";
import { ProductCard } from "../../components/ProductCard";
import { api, ApiError } from "../../api/client";
import type { ProductSummary, Category } from "../../api/types";
import { colors } from "../../theme";

export default function Home() {
  const router = useRouter();
  const featured = useQuery<ProductSummary[]>({
    queryKey: ["featured"],
    queryFn: () => api.get<ProductSummary[]>("/products/featured"),
  });
  const categories = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
    staleTime: Infinity,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.hero}>
          <Text style={s.brand}>VedMedAgri</Text>
          <Text style={s.tagline}>Professional veterinary & agricultural supplies</Text>
          <Pressable style={s.search} onPress={() => router.push("/shop" as Href)}>
            <Ionicons name="search" size={16} color={colors.faint} />
            <Text style={s.searchText}>Search products…</Text>
          </Pressable>
        </View>

        {(categories.data?.length ?? 0) > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={s.sectionTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              {categories.data!.slice(0, 12).map((c) => (
                <Pressable key={c.id} style={s.chip} onPress={() => router.push(`/shop?category=${c.slug}` as Href)}>
                  <Text style={s.chipText} numberOfLines={1}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Featured</Text>
          <Pressable onPress={() => router.push("/shop" as Href)}>
            <Text style={s.link}>See all</Text>
          </Pressable>
        </View>

        {featured.isLoading ? (
          <Loading />
        ) : featured.isError ? (
          <ErrorView message={(featured.error as ApiError)?.message} onRetry={featured.refetch} />
        ) : (
          <FlatList
            data={featured.data ?? []}
            keyExtractor={(p) => String(p.id)}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => <ProductCard product={item} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { padding: 16, paddingTop: 8 },
  brand: { fontSize: 30, fontWeight: "900", color: colors.text },
  tagline: { fontSize: 14, color: colors.muted, marginTop: 4 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16 },
  searchText: { color: colors.faint, fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10, paddingRight: 16 },
  link: { color: colors.brand, fontWeight: "700" },
  chipRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, maxWidth: 170 },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
});
