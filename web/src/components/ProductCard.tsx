import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import type { ProductSummary } from "../api/types";
import PriceDisplay from "./PriceDisplay";
import { useCartStore } from "../store/cart";

interface Props {
  product: ProductSummary;
}

export default function ProductCard({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const img = product.images[0];
  const inStock = product.stockStatus === "IN_STOCK";

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!inStock || !product.price) return;
    addItem({
      productId: product.id,
      variantId: null,
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      image: img?.url ?? null,
      sku: product.sku,
    });
  }

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-square bg-gray-50/50 overflow-hidden flex items-center justify-center p-4">
        {img ? (
          <img
            src={img.url}
            alt={img.alt ?? product.name}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            No image
          </div>
        )}
        {!inStock && (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-gray-900/90 text-white px-2.5 py-1 rounded-full shadow-xs">
            Out of stock
          </span>
        )}
        {product.salePrice && product.regularPrice && product.salePrice !== product.regularPrice && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white px-2.5 py-1 rounded-full shadow-xs">
            Sale
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-1.5 bg-white border-t border-gray-50">
        {product.brand ? (
          <span className="text-[10px] text-brand font-bold uppercase tracking-widest block">
            {product.brand.name}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest block">
            General
          </span>
        )}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-brand transition-colors">
          {product.name}
        </h3>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <PriceDisplay
            price={product.price}
            regularPrice={product.regularPrice}
            salePrice={product.salePrice}
            className="text-base font-bold text-gray-950"
          />
          {inStock && product.price && (
            <button
              onClick={handleAddToCart}
              className="p-2 rounded-xl bg-teal-50 text-brand hover:bg-brand hover:text-white transition-all duration-300 shadow-xs hover:shadow-md"
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart size={16} />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

