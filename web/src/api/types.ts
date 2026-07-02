export interface ProductSummary {
  id: number;
  slug: string;
  name: string;
  status: string;
  type: string;
  featured: boolean;
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  stockStatus: "IN_STOCK" | "OUT_OF_STOCK" | "ON_BACKORDER";
  stockQuantity: number | null;
  manageStock: boolean;
  sku: string | null;
  bonusBuyQty: number | null;
  bonusFreeQty: number | null;
  expiryDate: string | null;
  batchNumber: string | null;
  images: { url: string; alt: string | null }[];
  brand: { id: number; name: string; slug: string } | null;
  categories: { id: number; name: string; slug: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface AttributeValue {
  id: number;
  value: string;
  slug: string;
  attribute: { id: number; name: string; slug: string; label: string };
}

export interface ProductVariant {
  id: number;
  sku: string | null;
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  stockStatus: "IN_STOCK" | "OUT_OF_STOCK" | "ON_BACKORDER";
  stockQuantity: number | null;
  imageUrl: string | null;
  attributes: { attributeValue: AttributeValue }[];
}

export interface Review {
  id: number;
  authorName: string | null;
  rating: number | null;
  content: string | null;
  createdAt: string;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  shortDescription: string | null;
  weight: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  tags: { id: number; name: string; slug: string }[];
  variants: ProductVariant[];
  reviews: Review[];
  reviewSummary: { count: number; avg: number | null };
  seoTitle: string | null;
  seoDesc: string | null;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: number | null;
}

export interface Brand {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface ListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderSummary {
  id: number;
  status: string;
  total: string;
  currency: string;
  createdAt: string;
  datePaid: string | null;
  paymentMethodTitle: string | null;
  items: { name: string; quantity: number; total: string }[];
  _count: { items: number };
}

export interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
}
