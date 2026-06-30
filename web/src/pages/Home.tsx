import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  Headphones,
  Activity,
  Snowflake,
  ClipboardList,
  Flame,
  Gift,
  Star,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { api } from "../api/client";
import type { ProductSummary, Category } from "../api/types";
import ProductGrid from "../components/ProductGrid";

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case "pharmaceuticals":
      return <Activity className="w-5 h-5 text-emerald-600 animate-pulse" />;
    case "diagnostics":
      return <ClipboardList className="w-5 h-5 text-emerald-600" />;
    case "cold-chain":
      return <Snowflake className="w-5 h-5 text-emerald-600 animate-spin-slow" />;
    default:
      return <Flame className="w-5 h-5 text-emerald-600" />;
  }
};

export default function Home() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => api.get<ProductSummary[]>("/products/featured"),
  });

  const { data: dbCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
    staleTime: Infinity,
  });

  const categories = dbCategories?.slice(0, 4).map((c) => ({
    name: c.name,
    slug: c.slug,
    icon: getCategoryIcon(c.slug),
    description: c.description ?? "Quality animal health supplies.",
  })) ?? [
    {
      name: "Pharmaceuticals",
      slug: "pharmaceuticals",
      icon: <Activity className="w-5 h-5 text-emerald-600 animate-pulse" />,
      description: "Antibiotics, vaccines & specialized medication.",
    },
    {
      name: "Diagnostics",
      slug: "diagnostics",
      icon: <ClipboardList className="w-5 h-5 text-emerald-600" />,
      description: "Rapid test kits, analyzers & diagnostic reagents.",
    },
    {
      name: "Cold Chain Storage",
      slug: "cold-chain",
      icon: <Snowflake className="w-5 h-5 text-emerald-600 animate-spin-slow" />,
      description: "Temperature sensitive vaccine handlers.",
    },
    {
      name: "Surgical & Care",
      slug: "surgical",
      icon: <Flame className="w-5 h-5 text-emerald-600" />,
      description: "Autoclaves, surgical tools & sterile consumables.",
    },
  ];

  return (
    <div className="bg-gray-50/50 min-h-screen text-gray-800">
      <Helmet>
        <title>VetMedAgri — Premium Veterinary &amp; Agricultural Store</title>
        <meta
          name="description"
          content="Singapore's premier distributor of veterinary pharmaceuticals, equipment, diagnostics, and cold-chain animal vaccine supplies."
        />
      </Helmet>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#022c22] text-white py-28 md:py-36 px-4">
        {/* Ambient background gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.1),transparent_40%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-300 text-xs font-bold tracking-wide uppercase animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Licensed SFA Singapore Distributor
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-white font-display">
            Professional Veterinary &amp; <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-200">
              Agricultural Supplies
            </span>
          </h1>

          <p className="text-gray-300 text-base sm:text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Leading supplier of pharmaceuticals, clinical diagnostic kits, temperature-controlled vaccines, and farm care accessories.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand text-white font-bold px-8 py-4 rounded-xl hover:bg-brand-dark shadow-lg shadow-teal-950/50 hover:shadow-teal-950/80 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Explore Full Catalog <ArrowRight size={16} />
            </Link>
            <Link
              to="/shop?category=pharmaceuticals"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 bg-white/5 backdrop-blur-xs text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              Clinical Range
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Value Props */}
      <section className="relative -mt-10 max-w-6xl mx-auto px-4 z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <ShieldCheck className="text-emerald-600 w-6 h-6" />,
              title: "Certified Integrity",
              desc: "100% genuine medical vaccines, items, and accessories from GMP-compliant manufacturers.",
            },
            {
              icon: <Truck className="text-emerald-600 w-6 h-6" />,
              title: "Active Cold Chain Delivery",
              desc: "Carefully temperature-monitored islandwide logistics ensuring optimal medicine potency.",
            },
            {
              icon: <Headphones className="text-emerald-600 w-6 h-6" />,
              title: "Dedicated Clinical Support",
              desc: "Consult our animal health specialists for clinical trials, bulk ordering, or accounts.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-gray-100/80 shadow-xs hover:shadow-lg transition-all duration-300 flex gap-4 items-start"
            >
              <div className="p-3 bg-emerald-50 rounded-xl flex-shrink-0">{item.icon}</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1 text-base">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Grid Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-bold text-brand uppercase tracking-wider block mb-1">Browse Specialties</span>
          <h2 className="text-3xl font-extrabold text-gray-900">Explore Key Categories</h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            Search our curated collections cataloged by veterinary clinical diagnostics, cold chain supplies, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/shop?category=${cat.slug}`}
              className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-2xs hover:border-brand hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[160px]"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all duration-300">
                  {cat.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-brand transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-gray-400 font-medium line-clamp-2">{cat.description}</p>
              </div>
              <span className="text-xs font-bold text-gray-400 mt-4 group-hover:text-brand flex items-center gap-1">
                View Category <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Interactive Promotional banner */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-700/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-800/15 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold tracking-wider uppercase">
                <Gift size={13} /> Bulk Order Discounts
              </div>
              <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                Establish Practice Accounts &amp; Save Up to 20%
              </h3>
              <p className="text-sm md:text-base text-emerald-100/80 font-light leading-relaxed">
                Save on vaccines, consumables, diagnostics, and surgical equipment. Reach out to our billing team to arrange clinic accounts.
              </p>
            </div>
            <Link
              to="/shop"
              className="flex items-center gap-2 bg-white text-emerald-950 font-bold px-6 py-3.5 rounded-xl hover:bg-emerald-50 transition-all flex-shrink-0"
            >
              Order Clinic Supplies Now <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-xs font-bold text-brand uppercase tracking-wider block mb-1">Clinic Favorites</span>
            <h2 className="text-3xl font-extrabold text-gray-900">Featured Products</h2>
          </div>
          <Link
            to="/shop"
            className="group text-sm text-brand font-bold hover:text-brand-dark flex items-center gap-1 transition-colors"
          >
            View all products{" "}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <ProductGrid products={featured ?? []} loading={isLoading} />
      </section>

      {/* Testimonials highlight */}
      <section className="bg-white border-t border-b border-gray-100 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="flex justify-center text-amber-400 gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={18} fill="currentColor" />
            ))}
          </div>
          <blockquote className="text-lg md:text-xl font-medium text-gray-800 italic leading-relaxed">
            "VetMedAgri has completely transformed our inventory management. The cold-chain vaccines arrive perfectly temperature-controlled and the clinic wholesale pricing helps us keep patient care affordable."
          </blockquote>
          <div>
            <cite className="not-italic font-bold text-gray-900 text-sm block">Dr. Sarah Lim, DVM</cite>
            <span className="text-xs text-gray-400 font-semibold block mt-0.5">Woodlands Veterinary Clinic</span>
          </div>
        </div>
      </section>

      {/* Brand Ethos certifications footer banner */}
      <section className="bg-teal-950 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h3 className="text-2xl md:text-3xl font-bold font-display">Dedicated Veterinary Partners</h3>
          <p className="text-teal-200/80 mb-8 max-w-xl mx-auto font-light text-sm md:text-base leading-relaxed">
            Providing reliable diagnostics, vaccine formulations, and animal health accessories since 2012. Singapore's leading professional veterinary store.
          </p>
          <div className="flex items-center justify-center gap-8 opacity-65 flex-wrap pt-4">
            <span className="font-semibold tracking-widest text-[10px] uppercase bg-teal-900/50 px-3 py-1 rounded border border-teal-800">
              GMP Compliant
            </span>
            <span className="font-semibold tracking-widest text-[10px] uppercase bg-teal-900/50 px-3 py-1 rounded border border-teal-800">
              SFA Licensed
            </span>
            <span className="font-semibold tracking-widest text-[10px] uppercase bg-teal-900/50 px-3 py-1 rounded border border-teal-800">
              SGS Quality Assurance
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
