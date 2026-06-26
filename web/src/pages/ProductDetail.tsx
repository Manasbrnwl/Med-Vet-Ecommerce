import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ShoppingCart, ArrowLeft, Package } from "lucide-react";
import { api } from "../api/client";
import type { ProductDetail as ProductDetailType, ProductVariant } from "../api/types";
import PriceDisplay from "../components/PriceDisplay";
import StarRating from "../components/StarRating";
import { useCartStore } from "../store/cart";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get<ProductDetailType>(`/products/${slug}`),
    enabled: !!slug,
  });

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-gray-100 rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-6 bg-gray-100 rounded w-1/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Product not found.</p>
        <Link to="/shop" className="text-brand hover:underline">← Back to shop</Link>
      </div>
    );
  }

  const activeVariant = selectedVariant;
  const displayPrice = activeVariant?.price ?? product.price;
  const displayRegular = activeVariant?.regularPrice ?? product.regularPrice;
  const displaySale = activeVariant?.salePrice ?? product.salePrice;
  const stockStatus = activeVariant?.stockStatus ?? product.stockStatus;
  const inStock = stockStatus === "IN_STOCK";
  const images = product.images;
  const currentImg = images[imgIdx];

  function handleAddToCart() {
    if (!inStock) return;
    addItem({
      productId: product!.id,
      variantId: activeVariant?.id ?? null,
      slug: product!.slug,
      name: product!.name + (activeVariant ? ` (${activeVariant.attributes.map(a => a.attributeValue.value).join(", ")})` : ""),
      price: Number(displayPrice ?? displayRegular ?? 0),
      image: currentImg?.url ?? null,
      sku: activeVariant?.sku ?? product!.sku,
      qty,
    });
  }

  const metaTitle = product.seoTitle ?? `${product.name} — VetMedAgri`;
  const metaDesc  = product.seoDesc ?? product.shortDescription?.replace(/<[^>]+>/g, "").slice(0, 160) ?? "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Helmet>
        <title>{metaTitle}</title>
        {metaDesc && <meta name="description" content={metaDesc} />}
        {currentImg && <meta property="og:image" content={currentImg.url} />}
        <meta property="og:type" content="product" />
      </Helmet>
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-6">
        <ArrowLeft size={14} /> Back to shop
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-xl border border-gray-100 bg-white overflow-hidden flex items-center justify-center p-6">
            {currentImg ? (
              <img
                src={currentImg.url}
                alt={currentImg.alt ?? product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Package size={64} className="text-gray-200" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden ${i === imgIdx ? "border-brand" : "border-gray-100"}`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          {product.brand && (
            <Link
              to={`/shop?brand=${product.brand.slug}`}
              className="text-sm font-medium text-brand uppercase tracking-wide hover:underline"
            >
              {product.brand.name}
            </Link>
          )}

          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

          {product.reviewSummary.count > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.reviewSummary.avg ?? 0} />
              <span className="text-sm text-gray-500">({product.reviewSummary.count} reviews)</span>
            </div>
          )}

          <PriceDisplay
            price={displayPrice}
            regularPrice={displayRegular}
            salePrice={displaySale}
            className="text-2xl"
          />

          <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${inStock ? "text-green-600" : "text-red-500"}`}>
            <span className={`w-2 h-2 rounded-full ${inStock ? "bg-green-500" : "bg-red-400"}`} />
            {inStock ? "In Stock" : "Out of Stock"}
          </div>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Options</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const label = v.attributes.map(a => a.attributeValue.value).join(" / ");
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(isSelected ? null : v)}
                      disabled={v.stockStatus === "OUT_OF_STOCK"}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected
                          ? "border-brand bg-brand text-white"
                          : "border-gray-200 text-gray-700 hover:border-brand hover:text-brand"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Qty + Add to cart */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-3 py-2 hover:bg-gray-50 text-gray-600"
              >
                −
              </button>
              <span className="px-4 py-2 text-sm font-medium">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="px-3 py-2 hover:bg-gray-50 text-gray-600"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="flex-1 flex items-center justify-center gap-2 bg-brand text-white py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={18} />
              {inStock ? "Add to Cart" : "Out of Stock"}
            </button>
          </div>

          {/* Short description */}
          {product.shortDescription && (
            <div
              className="text-sm text-gray-600 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.shortDescription }}
            />
          )}

          {product.sku && (
            <p className="text-xs text-gray-400">SKU: {product.sku}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="mt-12 border-t border-gray-100 pt-8">
          <h2 className="text-lg font-semibold mb-4">Product Description</h2>
          <div
            className="prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}

      {/* Reviews */}
      {product.reviews.length > 0 && (
        <div className="mt-12 border-t border-gray-100 pt-8">
          <h2 className="text-lg font-semibold mb-4">
            Reviews ({product.reviewSummary.count})
            {product.reviewSummary.avg && (
              <span className="ml-2 text-base font-normal text-gray-500">
                — {product.reviewSummary.avg.toFixed(1)} / 5
              </span>
            )}
          </h2>
          <div className="space-y-4">
            {product.reviews.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-4 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  {r.rating && <StarRating rating={r.rating} size={14} />}
                  <span className="font-medium text-sm text-gray-800">{r.authorName ?? "Anonymous"}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(r.createdAt).toLocaleDateString("en-SG")}
                  </span>
                </div>
                {r.content && <p className="text-sm text-gray-600">{r.content}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
