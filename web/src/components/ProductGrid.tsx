import type { ProductSummary } from "../api/types";
import ProductCard from "./ProductCard";

interface Props {
  products: ProductSummary[];
  loading?: boolean;
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function ProductGrid({ products, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-center py-16 text-gray-500">
        No products found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
