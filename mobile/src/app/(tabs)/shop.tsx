import { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Input, Loading, ErrorView, Empty } from "../../components/ui";
import { ProductCard } from "../../components/ProductCard";
import { api, ApiError } from "../../api/client";
import type { ProductListResponse, Category } from "../../api/types";
import { colors } from "../../theme";

const LIMIT = 16;

export default function Shop() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(params.category ?? null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
    staleTime: Infinity,
  });

  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ProductListResponse>({
      queryKey: ["products", q, category],
      initialPageParam: 1,
      queryFn: ({ pageParam }) => {
        const p = new URLSearchParams();
        p.set("page", String(pageParam));
        p.set("limit", String(LIMIT));
        if (q) p.set("q", q);
        if (category) p.set("category", category);
        return api.get<ProductListResponse>(`/products?${p.toString()}`);
      },
      getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    });

  const products = data?.pages.flatMap((p) => p.products) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  return (
    <Screen style={{ padding: 0 }}>
      <View style={s.header}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color={colors.faint} />
          <Input
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setQ(search.trim())}
            returnKeyType="search"
            placeholder="Search products…"
            style={s.searchInput}
          />
          {search ? (
            <Pressable onPress={() => { setSearch(""); setQ(""); }}>
              <Ionicons name="close-circle" size={18} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 0, slug: "", name: "All" } as Partial<Category>, ...(categories ?? [])]}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
          renderItem={({ item }) => {
            const active = (item.slug || null) === category;
            return (
              <Pressable onPress={() => setCategory(item.slug || null)} style={[s.chip, active && s.chipOn]}>
                <Text style={[s.chipText, active && { color: "#fff" }]} numberOfLines={1}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorView message={(error as ApiError)?.message} onRetry={refetch} />
      ) : products.length === 0 ? (
        <Empty title="No products found" subtitle={q ? `Nothing matches “${q}”.` : undefined} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
          ListHeaderComponent={<Text style={s.count}>{total} products</Text>}
          renderItem={({ item }) => <ProductCard product={item} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ margin: 16 }} color={colors.brand} /> : null}
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border, maxWidth: 160 },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  count: { paddingHorizontal: 16, fontSize: 12, color: colors.muted, fontWeight: "600" },
});
