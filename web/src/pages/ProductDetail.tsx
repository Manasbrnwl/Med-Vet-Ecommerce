import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ShoppingCart, ArrowLeft, Package, Sparkles, Scale, CheckCircle2, Gift } from "lucide-react";
import { api } from "../api/client";
import type { ProductDetail as ProductDetailType, ProductVariant } from "../api/types";
import PriceDisplay from "../components/PriceDisplay";
import StarRating from "../components/StarRating";
import { useCartStore } from "../store/cart";
import { expiryStatus, formatExpiry } from "../utils/expiry";

type TabID = "description" | "specifications" | "reviews";

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
  const [activeTab, setActiveTab] = useState<TabID>("description");

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse space-y-8">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-gray-100/70 rounded-2xl" />
          <div className="space-y-6">
            <div className="h-4 bg-gray-100/70 rounded w-1/4" />
            <div className="h-10 bg-gray-100/70 rounded w-3/4" />
            <div className="h-6 bg-gray-100/70 rounded w-1/3" />
            <div className="h-20 bg-gray-100/70 rounded w-full" />
            <div className="h-12 bg-gray-100/70 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg mb-6">Product not found.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-dark transition-all"
        >
          <ArrowLeft size={16} /> Back to Catalog
        </Link>
      </div>
    );
  }

  const activeVariant = selectedVariant;
  const displayPrice = activeVariant?.price ?? product.price;
  const displayRegular = activeVariant?.regularPrice ?? product.regularPrice;
  const displaySale = activeVariant?.salePrice ?? product.salePrice;
  const stockStatus = activeVariant?.stockStatus ?? product.stockStatus;
  const inStock = stockStatus === "IN_STOCK";
  const expStatus = expiryStatus(product.expiryDate);
  const expired = expStatus === "expired";
  const canBuy = inStock && !expired;
  const images = product.images;
  const currentImg = images[imgIdx];

  function handleAddToCart() {
    if (!canBuy) return;
    addItem({
      productId: product!.id,
      variantId: activeVariant?.id ?? null,
      slug: product!.slug,
      name: product!.name + (activeVariant ? ` (${activeVariant.attributes.map(a => a.attributeValue.value).join(", ")})` : ""),
      price: Number(displayPrice ?? displayRegular ?? 0),
      image: currentImg?.url ?? null,
      sku: activeVariant?.sku ?? product!.sku,
      bonusBuyQty: product!.bonusBuyQty,
      bonusFreeQty: product!.bonusFreeQty,
      expiryDate: product!.expiryDate,
      qty,
    });
  }

  // Calculate review average distribution helper
  const reviewCount = product.reviews.length;
  const starDistribution = [0, 0, 0, 0, 0]; // 1-star to 5-star
  product.reviews.forEach((r) => {
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      starDistribution[r.rating - 1]++;
    }
  });

  const metaTitle = product.seoTitle ?? `${product.name} — VetMedAgri`;
  const metaDesc  = product.seoDesc ?? product.shortDescription?.replace(/<[^>]+>/g, "").slice(0, 160) ?? "";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <Helmet>
        <title>{metaTitle}</title>
        {metaDesc && <meta name="description" content={metaDesc} />}
        {currentImg && <meta property="og:image" content={currentImg.url} />}
        <meta property="og:type" content="product" />
      </Helmet>

      {/* Breadcrumb / Navigation link */}
      <Link
        to="/shop"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-brand transition-all mb-8 uppercase tracking-wider"
      >
        <ArrowLeft size={13} /> Back to shop
      </Link>

      <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
        {/* Left Column: Premium Images Viewer */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl border border-gray-100 bg-white shadow-xs overflow-hidden flex items-center justify-center p-8 transition-all relative">
            {currentImg ? (
              <img
                src={currentImg.url}
                alt={currentImg.alt ?? product.name}
                className="w-full h-full object-contain max-h-[420px] transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-300">
                <Package size={80} strokeWidth={1} />
                <span className="text-xs font-bold text-gray-400">No Image Available</span>
              </div>
            )}
            {/* Discount Badge overlay */}
            {displaySale && (
              <span className="absolute top-4 left-4 bg-red-500 text-white text-xxs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                Sale Offer
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto py-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-2xl border-2 overflow-hidden bg-white p-1.5 transition-all shadow-3xs hover:border-brand ${
                    i === imgIdx ? "border-brand scale-95" : "border-gray-100"
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Key Details & Purchasing Panel */}
        <div className="space-y-6 bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xs">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && (
                <Link
                  to={`/shop?brand=${product.brand.slug}`}
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide hover:bg-emerald-100/80 transition-all"
                >
                  <Sparkles size={12} /> {product.brand.name}
                </Link>
              )}
              <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${inStock ? "bg-green-500" : "bg-red-500 animate-ping"}`} />
                {inStock ? "In Stock" : "Out of Stock"}
              </div>
              {expired ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                  Expired
                </div>
              ) : expStatus === "soon" ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                  Expiring soon
                </div>
              ) : null}
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Rating Summary Indicator */}
            {product.reviewSummary.count > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <StarRating rating={product.reviewSummary.avg ?? 0} />
                <button
                  onClick={() => {
                    setActiveTab("reviews");
                    document.getElementById("detail-tabs")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-xs font-bold text-gray-400 hover:text-brand transition-all hover:underline"
                >
                  ({product.reviewSummary.count} reviews)
                </button>
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Pricing display details */}
          <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100/80">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Price</div>
            <div className="flex items-baseline gap-3">
              <PriceDisplay
                price={displayPrice}
                regularPrice={displayRegular}
                salePrice={displaySale}
                className="text-3xl font-extrabold text-gray-950"
              />
            </div>
            {product.sku && (
              <div className="mt-2 text-xs font-semibold text-gray-500">
                SKU: <span className="text-gray-700 font-bold">{activeVariant?.sku ?? product.sku}</span>
              </div>
            )}
            {product.expiryDate && (
              <div
                className={`mt-1 text-xs font-semibold ${
                  expired ? "text-red-600" : expStatus === "soon" ? "text-amber-600" : "text-gray-500"
                }`}
              >
                {expired ? "Expired" : "Expiry"}:{" "}
                <span className="font-bold">{formatExpiry(product.expiryDate)}</span>
                {product.batchNumber && (
                  <span className="text-gray-500 font-medium"> · Batch {product.batchNumber}</span>
                )}
              </div>
            )}
          </div>

          {/* Options / Variants */}
          {product.variants.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Select Option</span>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const label = v.attributes.map((a) => a.attributeValue.value).join(" / ");
                  const isSelected = selectedVariant?.id === v.id;
                  const variantOutOfStock = v.stockStatus === "OUT_OF_STOCK";

                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(isSelected ? null : v)}
                      disabled={variantOutOfStock}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected
                          ? "border-brand bg-brand text-white shadow-sm shadow-brand/20"
                          : "border-gray-200 text-gray-600 bg-white hover:border-brand hover:text-brand hover:bg-gray-50/50"
                      }`}
                    >
                      {label} {variantOutOfStock && "(Out of Stock)"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bulk bonus offer */}
          {product.bonusBuyQty && product.bonusFreeQty ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3">
              <Gift size={18} className="flex-shrink-0" />
              <span className="text-sm font-bold">
                Bulk bonus: buy {product.bonusBuyQty}, get {product.bonusFreeQty} free
                {qty >= product.bonusBuyQty && (
                  <span className="ml-1 font-semibold">
                    — you’ll get {Math.floor(qty / product.bonusBuyQty) * product.bonusFreeQty} free ({qty + Math.floor(qty / product.bonusBuyQty) * product.bonusFreeQty} total)
                  </span>
                )}
              </span>
            </div>
          ) : null}

          {/* Adding parameters & Actions */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-3xs">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3.5 py-3 hover:bg-gray-50 text-gray-500 transition-colors font-bold"
                >
                  −
                </button>
                <span className="px-4 py-3 text-sm font-bold text-gray-800 select-none min-w-[36px] text-center">
                  {qty}
                </span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="px-3.5 py-3 hover:bg-gray-50 text-gray-500 transition-colors font-bold"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!canBuy}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md shadow-brand/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <ShoppingCart size={18} />
                {expired ? "Expired — Unavailable" : inStock ? "Add to Order Cart" : "Out of Stock"}
              </button>
            </div>
          </div>

          {/* Short description prose */}
          {product.shortDescription && (
            <div className="pt-4 border-t border-gray-100">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Quick Overview</div>
              <div
                className="text-sm text-gray-600 leading-relaxed font-medium"
                dangerouslySetInnerHTML={{ __html: product.shortDescription }}
              />
            </div>
          )}

          {/* Delivery & Security Indicators */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xxs font-extrabold uppercase tracking-wider text-gray-400">
            <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <CheckCircle2 className="text-emerald-500 w-4 h-4 flex-shrink-0" />
              <span>GMP Standard Certified</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <Scale className="text-emerald-500 w-4 h-4 flex-shrink-0" />
              <span>Singapore SFA Checked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs segment: Description, Specifications, and Reviews */}
      <div id="detail-tabs" className="border-t border-gray-100 pt-10">
        <div className="flex border-b border-gray-150 gap-8 mb-8 overflow-x-auto">
          {(["description", "specifications", "reviews"] as TabID[]).map((tab) => {
            const isActive = activeTab === tab;
            const label =
              tab === "description"
                ? "Description"
                : tab === "specifications"
                ? "Specifications"
                : `Reviews (${reviewCount})`;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 uppercase ${
                  isActive
                    ? "border-brand text-brand font-extrabold"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab contents */}
        <div className="min-h-[220px]">
          {activeTab === "description" && (
            <div className="prose prose-emerald prose-sm max-w-none text-gray-600 leading-relaxed font-medium">
              {product.description ? (
                <div dangerouslySetInnerHTML={{ __html: product.description }} />
              ) : (
                <p className="text-gray-400 text-xs">No detailed description has been added for this product yet.</p>
              )}
            </div>
          )}

          {activeTab === "specifications" && (
            <div className="max-w-2xl bg-white border border-gray-100 rounded-2xl shadow-3xs overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3.5 bg-gray-50/50 font-bold text-gray-400 text-xs uppercase tracking-wider w-1/3">
                      SKU Code
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-700">{product.sku ?? "N/A"}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3.5 bg-gray-50/50 font-bold text-gray-400 text-xs uppercase tracking-wider">
                      Product Weight
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-700">{product.weight ? `${product.weight} kg` : "N/A"}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3.5 bg-gray-50/50 font-bold text-gray-400 text-xs uppercase tracking-wider">
                      Dimensions (L x W x H)
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-700">
                      {product.length || product.width || product.height
                        ? `${product.length ?? "0"}m x ${product.width ?? "0"}m x ${product.height ?? "0"}m`
                        : "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3.5 bg-gray-50/50 font-bold text-gray-400 text-xs uppercase tracking-wider">
                      Specialist Brand
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-700">
                      {product.brand?.name ?? "Independent Supplies"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3.5 bg-gray-50/50 font-bold text-gray-400 text-xs uppercase tracking-wider">
                      Categories
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-700">
                      {product.categories.map((c) => c.name).join(", ") || "Uncategorized"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-8">
              {/* Summary analytics metrics */}
              <div className="grid md:grid-cols-3 bg-white border border-gray-100 rounded-3xl p-6 gap-8 items-center shadow-3xs">
                <div className="text-center md:border-r border-gray-100 py-2">
                  <h4 className="text-5xl font-extrabold text-gray-900 leading-none mb-2">
                    {product.reviewSummary.avg ? product.reviewSummary.avg.toFixed(1) : "0.0"}
                  </h4>
                  <div className="flex justify-center text-amber-400 gap-0.5 mb-1">
                    <StarRating rating={product.reviewSummary.avg ?? 0} size={15} />
                  </div>
                  <span className="text-xs font-bold text-gray-400 block">Out of 5 stars</span>
                </div>

                <div className="col-span-2 space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = starDistribution[stars - 1] ?? 0;
                    const percent = reviewCount ? (count / reviewCount) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs font-bold text-gray-500">
                        <span className="w-10 text-right">{stars} star</span>
                        <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-amber-400 h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="w-6 text-right font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review lists */}
              {product.reviews.length > 0 ? (
                <div className="space-y-4">
                  {product.reviews.map((r) => {
                    const initials = r.authorName
                      ? r.authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "A";

                    return (
                      <div key={r.id} className="border border-gray-100/80 rounded-2xl p-5 bg-white shadow-2xs hover:shadow-xs transition-all flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-extrabold text-sm text-gray-800 truncate">
                              {r.authorName ?? "Anonymous Customer"}
                            </span>
                            <span className="text-xxs font-bold text-gray-400">
                              {new Date(r.createdAt).toLocaleDateString("en-SG", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="text-amber-400">
                            <StarRating rating={r.rating ?? 5} size={12} />
                          </div>
                          {r.content && (
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                              {r.content}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs font-bold">
                  No verified patient or clinic reviews have been posted yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
