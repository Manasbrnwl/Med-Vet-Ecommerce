import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { api } from "../api/client";
import type { ProductSummary } from "../api/types";
import ProductGrid from "../components/ProductGrid";

export default function Home() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => api.get<ProductSummary[]>("/products/featured"),
  });

  return (
    <div>
      <Helmet>
        <title>VetMedAgri — Veterinary &amp; Agricultural Products Singapore</title>
        <meta name="description" content="Singapore's trusted source for veterinary and agricultural products. Professional-grade supplies for animal care and farm management, delivered islandwide." />
      </Helmet>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand to-brand-dark text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Veterinary & Agricultural<br />Products in Singapore
          </h1>
          <p className="text-brand-light text-lg mb-8 max-w-xl mx-auto">
            Professional-grade products for animal care and farm management, delivered islandwide.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-white text-brand font-semibold px-6 py-3 rounded-xl hover:bg-brand-light transition-colors"
          >
            Shop Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <Link
            to="/shop"
            className="text-sm text-brand font-medium hover:text-brand-dark flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <ProductGrid products={featured ?? []} loading={isLoading} />
      </section>

      {/* Value props */}
      <section className="bg-white border-t border-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { title: "Trusted Products", desc: "Sourced from reputable manufacturers" },
            { title: "Fast Delivery", desc: "Islandwide delivery across Singapore" },
            { title: "Expert Support", desc: "Professional advice from our team" },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
