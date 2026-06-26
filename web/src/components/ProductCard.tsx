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
      className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {img ? (
          <img
            src={img.url}
            alt={img.alt ?? product.name}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            No image
          </div>
        )}
        {!inStock && (
          <span className="absolute top-2 left-2 text-xs bg-gray-800 text-white px-2 py-0.5 rounded">
            Out of stock
          </span>
        )}
        {product.salePrice && product.regularPrice && product.salePrice !== product.regularPrice && (
          <span className="absolute top-2 right-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">
            Sale
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-3 gap-1">
        {product.brand && (
          <span className="text-xs text-brand font-medium uppercase tracking-wide">
            {product.brand.name}
          </span>
        )}
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
          {product.name}
        </h3>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <PriceDisplay
            price={product.price}
            regularPrice={product.regularPrice}
            salePrice={product.salePrice}
            className="text-sm"
          />
          {inStock && product.price && (
            <button
              onClick={handleAddToCart}
              className="p-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors"
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
