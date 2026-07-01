// Mirrors web/src/api/types.ts — the API contract shared with the storefront.

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
  tags: { id: number; name: string; slug: string }[];
  variants: ProductVariant[];
  reviews: Review[];
  reviewSummary: { count: number; avg: number | null };
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

export interface ProductListResponse {
  products: ProductSummary[];
  meta: ListMeta;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type AddressType = "BILLING" | "SHIPPING";

export interface Address {
  id: number;
  userId: number;
  type: AddressType;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  isDefault: boolean;
}

export interface Profile extends AuthUser {
  createdAt: string;
  addresses: Address[];
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

export interface OrderItem {
  id: number;
  productId: number | null;
  variantId: number | null;
  name: string;
  sku: string | null;
  quantity: number;
  bonusQuantity: number;
  subtotal: string;
  total: string;
  product?: { slug: string; images: { url: string; alt: string | null }[] } | null;
}

export interface OrderDetail {
  id: number;
  number: string | null;
  status: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  total: string;
  customerEmail: string | null;
  customerNote: string | null;
  paymentMethodTitle: string | null;
  datePaid: string | null;
  billing: Record<string, string> | null;
  shipping: Record<string, string> | null;
  items: OrderItem[];
  createdAt: string;
}

export interface CheckoutResponse {
  orderId: number;
  paymentUrl: string | null;
  note?: string;
  warning?: string;
}
