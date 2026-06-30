import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { SlidersHorizontal } from "lucide-react";
import { api } from "../api/client";
import type { ProductSummary, Category, Brand, ListMeta } from "../api/types";
import ProductGrid from "../components/ProductGrid";

interface ProductsResponse {
  products: ProductSummary[];
  meta: ListMeta;
}

const SORT_OPTIONS = [
  { label: "Newest Arrivals", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name A–Z", value: "name" },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "newest";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";

  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);

  useEffect(() => {
    setMinInput(minPrice);
  }, [minPrice]);

  useEffect(() => {
    setMaxInput(maxPrice);
  }, [maxPrice]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page"); // reset page on filter change
    setParams(next);
  }

  function handlePriceApply(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (minInput) next.set("minPrice", minInput); else next.delete("minPrice");
    if (maxInput) next.set("maxPrice", maxInput); else next.delete("maxPrice");
    next.delete("page");
    setParams(next);
  }

  function handlePriceClear() {
    setMinInput("");
    setMaxInput("");
    const next = new URLSearchParams(params);
    next.delete("minPrice");
    next.delete("maxPrice");
    next.delete("page");
    setParams(next);
  }

  // Infinite query for products
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery<ProductsResponse>({
    queryKey: ["products", "infinite", category, brand, q, sort, minPrice, maxPrice],
    queryFn: ({ pageParam = 1 }) => {
      const qs = new URLSearchParams();
      qs.set("page", String(pageParam));
      if (category) qs.set("category", category);
      if (brand) qs.set("brand", brand);
      if (q) qs.set("q", q);
      if (sort) qs.set("sort", sort);
      if (minPrice) qs.set("minPrice", minPrice);
      if (maxPrice) qs.set("maxPrice", maxPrice);
      qs.set("limit", "16");
      return api.get<ProductsResponse>(`/products?${qs}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const products = data?.pages.flatMap((p) => p.products) ?? [];
  const totalCount = data?.pages[0]?.meta.total ?? 0;

  // Intersection Observer to trigger next page load
  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => {
      observer.unobserve(sentinel);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, products.length]);

  // Query categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
    staleTime: Infinity,
  });

  // Query brands
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => api.get<Brand[]>("/brands"),
    staleTime: Infinity,
  });
  const pageTitle = q
    ? `Search: "${q}" — VetMedAgri`
    : `Shop All Products — VetMedAgri`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content="Browse professional veterinary and agricultural products at VetMedAgri Singapore." />
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">
            {q ? `Search results for "${q}"` : "All Products"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Displaying {products.length} of {totalCount} quality veterinary supplies
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-all shadow-xs"
          >
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar filters */}
        <aside
          className={`${
            filtersOpen ? "block" : "hidden"
          } md:block w-full md:w-60 flex-shrink-0 space-y-6`}
        >
          {/* Categories */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
            <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-widest mb-3">Category</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setParam("category", "")}
                  className={`text-sm w-full text-left px-3 py-2 rounded-xl transition-all font-semibold ${
                    !category
                      ? "bg-brand/10 text-brand"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  All Products
                </button>
              </li>
              {categories?.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setParam("category", c.slug)}
                    className={`text-sm w-full text-left px-3 py-2 rounded-xl transition-all font-semibold ${
                      category === c.slug
                        ? "bg-brand/10 text-brand"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Brands */}
          {brands && brands.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
              <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-widest mb-3">Brands</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setParam("brand", "")}
                    className={`text-sm w-full text-left px-3 py-2 rounded-xl transition-all font-semibold ${
                      !brand
                        ? "bg-brand/10 text-brand"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    All Brands
                  </button>
                </li>
                {brands.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => setParam("brand", b.slug)}
                      className={`text-sm w-full text-left px-3 py-2 rounded-xl transition-all font-semibold ${
                        brand === b.slug
                          ? "bg-brand/10 text-brand"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {b.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price Range Filter */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
            <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-widest mb-3">Price Range</h3>
            <form onSubmit={handlePriceApply} className="space-y-3">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minInput}
                    onChange={(e) => setMinInput(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-150 rounded-xl pl-6 pr-2 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all text-gray-700"
                  />
                </div>
                <span className="text-gray-400 text-xs font-semibold">—</span>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxInput}
                    onChange={(e) => setMaxInput(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-150 rounded-xl pl-6 pr-2 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all text-gray-700"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-brand text-white font-bold py-2 rounded-xl text-[10px] hover:bg-brand-dark transition-all shadow-xs"
                >
                  Apply
                </button>
                {(minPrice || maxPrice) && (
                  <button
                    type="button"
                    onClick={handlePriceClear}
                    className="px-2.5 border border-gray-250 text-gray-500 font-bold py-2 rounded-xl text-[10px] hover:bg-gray-50 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </aside>

        {/* Products Grid & Loading indicator */}
        <div className="flex-1 min-w-0">
          {isError ? (
            <div className="text-center py-16">
              <p className="text-gray-700 font-semibold">Couldn’t load products.</p>
              <p className="text-sm text-gray-400 mt-1">{(error as Error)?.message ?? "Please try again."}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 bg-brand text-white font-bold px-5 py-2 rounded-xl text-xs hover:bg-brand-dark transition-all"
              >
                Retry
              </button>
            </div>
          ) : (
            <ProductGrid products={products} loading={isLoading && products.length === 0} />
          )}

          {/* Observer Sentinel Element */}
          {hasNextPage && (
            <div ref={observerRef} className="flex justify-center py-10">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
                <span>Loading more items...</span>
              </div>
            </div>
          )}

          {/* No More Products Indicator */}
          {!hasNextPage && products.length > 0 && (
            <div className="text-center py-12 text-xs font-medium text-gray-400">
              You've viewed all {totalCount} products.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
