import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/client";
import type { ProductSummary, Category, Brand, ListMeta } from "../api/types";
import ProductGrid from "../components/ProductGrid";

interface ProductsResponse {
  products: ProductSummary[];
  meta: ListMeta;
}

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name A–Z", value: "name" },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = Number(params.get("page") ?? 1);
  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "newest";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }

  const qs = new URLSearchParams();
  if (page > 1) qs.set("page", String(page));
  if (category) qs.set("category", category);
  if (brand) qs.set("brand", brand);
  if (q) qs.set("q", q);
  if (sort) qs.set("sort", sort);
  qs.set("limit", "24");

  const { data, isLoading } = useQuery({
    queryKey: ["products", qs.toString()],
    queryFn: () => api.get<ProductsResponse>(`/products?${qs}`),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
    staleTime: Infinity,
  });

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => api.get<Brand[]>("/brands"),
    staleTime: Infinity,
  });

  const meta = data?.meta;
  const products = data?.products ?? [];

  const pageTitle = q
    ? `Search: "${q}" — VetMedAgri`
    : `Shop All Products — VetMedAgri`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content="Browse professional veterinary and agricultural products at VetMedAgri Singapore." />
        {page > 1 && <meta name="robots" content="noindex, follow" />}
      </Helmet>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {q ? `Search: "${q}"` : "All Products"}
          {meta && <span className="ml-2 text-base font-normal text-gray-400">({meta.total})</span>}
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`${filtersOpen ? "block" : "hidden"} md:block w-52 flex-shrink-0 space-y-6`}>
          {/* Categories */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">Category</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setParam("category", "")}
                  className={`text-sm w-full text-left px-2 py-1 rounded ${!category ? "text-brand font-medium" : "text-gray-600 hover:text-brand"}`}
                >
                  All
                </button>
              </li>
              {categories?.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setParam("category", c.slug)}
                    className={`text-sm w-full text-left px-2 py-1 rounded ${category === c.slug ? "text-brand font-medium" : "text-gray-600 hover:text-brand"}`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Brands */}
          {brands && brands.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Brand</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setParam("brand", "")}
                    className={`text-sm w-full text-left px-2 py-1 rounded ${!brand ? "text-brand font-medium" : "text-gray-600 hover:text-brand"}`}
                  >
                    All
                  </button>
                </li>
                {brands.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => setParam("brand", b.slug)}
                      className={`text-sm w-full text-left px-2 py-1 rounded ${brand === b.slug ? "text-brand font-medium" : "text-gray-600 hover:text-brand"}`}
                    >
                      {b.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Products */}
        <div className="flex-1 min-w-0">
          <ProductGrid products={products} loading={isLoading} />

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setParam("page", String(page - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600 px-3">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setParam("page", String(page + 1))}
                disabled={page >= meta.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
