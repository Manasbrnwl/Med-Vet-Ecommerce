import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Edit, Trash2, X, AlertCircle, Upload, Star, Loader2 } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import type { ProductSummary, ListMeta, Category, Brand } from "../../api/types";

interface ProductsResponse {
  data: ProductSummary[];
  meta: ListMeta;
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryIdFilter, setCategoryIdFilter] = useState("");
  const [brandIdFilter, setBrandIdFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("");

  const [editingProduct, setEditingProduct] = useState<ProductSummary | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Query categories and brands
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: () => api.get<Brand[]>("/brands"),
  });

  const handleCategoryChange = (val: string) => {
    setCategoryIdFilter(val);
    setPage(1);
  };

  const handleBrandChange = (val: string) => {
    setBrandIdFilter(val);
    setPage(1);
  };

  const handleStockStatusChange = (val: string) => {
    setStockStatusFilter(val);
    setPage(1);
  };

  // Form states
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formPrice, setFormPrice] = useState<number | "">("");
  const [formRegularPrice, setFormRegularPrice] = useState<number | "">("");
  const [formSalePrice, setFormSalePrice] = useState<number | "">("");
  const [formStockStatus, setFormStockStatus] = useState<"IN_STOCK" | "OUT_OF_STOCK" | "ON_BACKORDER">("IN_STOCK");
  const [formStockQuantity, setFormStockQuantity] = useState<number | "">("");
  const [formManageStock, setFormManageStock] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"PUBLISHED" | "DRAFT" | "PRIVATE">("PUBLISHED");
  const [formBonusBuy, setFormBonusBuy] = useState<number | "">("");
  const [formBonusFree, setFormBonusFree] = useState<number | "">("");
  const [formImages, setFormImages] = useState<{ id: number; url: string; isPrimary: boolean }[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imgBusy, setImgBusy] = useState(false);

  // Query products
  const { data, isLoading } = useQuery<ProductsResponse>({
    queryKey: ["admin", "products", page, search, statusFilter, categoryIdFilter, brandIdFilter, stockStatusFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", "15");
      if (search) q.set("q", search);
      if (statusFilter) q.set("status", statusFilter);
      if (categoryIdFilter) q.set("categoryId", categoryIdFilter);
      if (brandIdFilter) q.set("brandId", brandIdFilter);
      if (stockStatusFilter) q.set("stockStatus", stockStatusFilter);
      return api.get<ProductsResponse>(`/admin/products?${q}`);
    },
  });

  // Mutate create
  const createMutation = useMutation({
    mutationFn: (newProduct: any) => api.post<{ id: number }>("/admin/products", newProduct),
    onSuccess: async (created) => {
      if (pendingFile && created?.id) {
        try {
          await uploadToProduct(created.id, pendingFile);
        } catch (e) {
          setErrorMsg(`Product created, but image upload failed: ${apiErrorMessage(e)}`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err) => {
      setErrorMsg(apiErrorMessage(err));
    },
  });

  // Mutate update
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => api.put(`/admin/products/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setEditingProduct(null);
      resetForm();
    },
    onError: (err) => {
      setErrorMsg(apiErrorMessage(err));
    },
  });

  // Mutate delete (trash)
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });

  function resetForm() {
    setFormName("");
    setFormSku("");
    setFormPrice("");
    setFormRegularPrice("");
    setFormSalePrice("");
    setFormStockStatus("IN_STOCK");
    setFormStockQuantity("");
    setFormManageStock(false);
    setFormDescription("");
    setFormStatus("PUBLISHED");
    setFormBonusBuy("");
    setFormBonusFree("");
    setFormImages([]);
    setPendingFile(null);
    setErrorMsg("");
  }

  function openEdit(p: ProductSummary) {
    // Fetch full details of product to edit
    api.get<any>(`/admin/products/${p.id}`).then((fullP) => {
      setEditingProduct(p);
      setFormName(fullP.name);
      setFormSku(fullP.sku || "");
      setFormPrice(fullP.price ? Number(fullP.price) : "");
      setFormRegularPrice(fullP.regularPrice ? Number(fullP.regularPrice) : "");
      setFormSalePrice(fullP.salePrice ? Number(fullP.salePrice) : "");
      setFormStockStatus(fullP.stockStatus);
      setFormStockQuantity(fullP.stockQuantity ?? "");
      setFormManageStock(fullP.manageStock);
      setFormDescription(fullP.description || "");
      setFormStatus(fullP.status === "TRASH" ? "DRAFT" : fullP.status);
      setFormBonusBuy(fullP.bonusBuyQty ?? "");
      setFormBonusFree(fullP.bonusFreeQty ?? "");
      setFormImages(fullP.images ?? []);
    });
  }

  // ── Product image actions (edit mode uses the product id directly) ────────────
  async function uploadToProduct(productId: number, file: File) {
    const img = await api.upload<{ id: number; url: string; isPrimary: boolean }>(
      `/admin/products/${productId}/images`,
      file
    );
    return img;
  }

  async function handleAddImage(file: File) {
    if (!editingProduct) return;
    setImgBusy(true);
    setErrorMsg("");
    try {
      const img = await uploadToProduct(editingProduct.id, file);
      setFormImages((prev) => [...prev, img]);
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (e) {
      setErrorMsg(apiErrorMessage(e));
    } finally {
      setImgBusy(false);
    }
  }

  async function handleRemoveImage(imageId: number) {
    if (!editingProduct) return;
    setImgBusy(true);
    try {
      await api.delete(`/admin/products/${editingProduct.id}/images/${imageId}`);
      setFormImages((prev) => prev.filter((i) => i.id !== imageId));
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (e) {
      setErrorMsg(apiErrorMessage(e));
    } finally {
      setImgBusy(false);
    }
  }

  async function handleMakePrimary(imageId: number) {
    if (!editingProduct) return;
    setImgBusy(true);
    try {
      await api.put(`/admin/products/${editingProduct.id}/images/${imageId}/primary`, {});
      setFormImages((prev) => prev.map((i) => ({ ...i, isPrimary: i.id === imageId })));
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    } catch (e) {
      setErrorMsg(apiErrorMessage(e));
    } finally {
      setImgBusy(false);
    }
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    createMutation.mutate({
      name: formName,
      sku: formSku || null,
      price: formPrice === "" ? null : Number(formPrice),
      regularPrice: formRegularPrice === "" ? null : Number(formRegularPrice),
      salePrice: formSalePrice === "" ? null : Number(formSalePrice),
      stockStatus: formStockStatus,
      stockQuantity: formStockQuantity === "" ? null : Number(formStockQuantity),
      manageStock: formManageStock,
      description: formDescription || null,
      status: formStatus,
      bonusBuyQty: formBonusBuy === "" ? null : Number(formBonusBuy),
      bonusFreeQty: formBonusFree === "" ? null : Number(formBonusFree),
    });
  }

  function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct || !formName.trim()) return;
    updateMutation.mutate({
      id: editingProduct.id,
      updates: {
        name: formName,
        status: formStatus,
        price: formPrice === "" ? null : Number(formPrice),
        regularPrice: formRegularPrice === "" ? null : Number(formRegularPrice),
        salePrice: formSalePrice === "" ? null : Number(formSalePrice),
        stockStatus: formStockStatus,
        stockQuantity: formStockQuantity === "" ? null : Number(formStockQuantity),
        featured: editingProduct.featured,
        description: formDescription || null,
        bonusBuyQty: formBonusBuy === "" ? null : Number(formBonusBuy),
        bonusFreeQty: formBonusFree === "" ? null : Number(formBonusFree),
      },
    });
  }

  const products = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight">Products Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage catalog details, pricing, and stock levels.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-brand text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-dark transition-all shadow-xs"
        >
          <Plus size={16} /> New Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-gray-100 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or SKU..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { label: "All", value: "" },
              { label: "Published", value: "PUBLISHED" },
              { label: "Drafts", value: "DRAFT" },
              { label: "Trashed", value: "TRASH" },
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.value
                    ? "bg-brand text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category, Brand, and Stock Status Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-50 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Filter by Category</label>
            <select
              value={categoryIdFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-white border border-gray-200 text-xs font-semibold rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/30 text-gray-700"
            >
              <option value="">All Categories</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Filter by Brand</label>
            <select
              value={brandIdFilter}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full bg-white border border-gray-200 text-xs font-semibold rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/30 text-gray-700"
            >
              <option value="">All Brands</option>
              {brands?.map((br) => (
                <option key={br.id} value={br.id}>{br.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Stock Status</label>
            <select
              value={stockStatusFilter}
              onChange={(e) => handleStockStatusChange(e.target.value)}
              className="w-full bg-white border border-gray-200 text-xs font-semibold rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand/30 text-gray-700"
            >
              <option value="">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="ON_BACKORDER">On Backorder</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Product</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Status</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {isLoading ? (
                [1, 2, 3].map((n) => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-12" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-14" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                    <td className="p-4 pr-6"><div className="h-4 bg-gray-100 rounded w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border border-gray-100 bg-white flex-shrink-0 p-1 flex items-center justify-center">
                          {p.images?.[0] ? (
                            <img src={p.images[0].url} alt="" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-gray-300">No img</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 line-clamp-1">{p.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{p.type.toLowerCase()} product</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{p.sku ?? "—"}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === "PUBLISHED"
                            ? "bg-green-50 text-green-700"
                            : p.status === "DRAFT"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      {p.price ? `$${Number(p.price).toFixed(2)}` : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span
                          className={`text-xs font-semibold ${
                            p.stockStatus === "IN_STOCK" ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {p.stockStatus.replace("_", " ")}
                        </span>
                        {p.manageStock && (
                          <span className="text-[10px] text-gray-400">Qty: {p.stockQuantity ?? 0}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-gray-500 hover:text-brand hover:bg-gray-50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit size={16} />
                        </button>
                        {p.status !== "TRASH" && (
                          <button
                            onClick={() => {
                              if (confirm("Move this product to trash?")) deleteMutation.mutate(p.id);
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Trash Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 p-4">
            <span className="text-xs text-gray-500">
              Showing page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center Overlay Modals for Create & Edit */}
      {(isCreateOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">
                  {isCreateOpen ? "Create New Product" : "Edit Product Details"}
                </h3>
                <p className="text-xs text-gray-500">Complete the form below to update store inventory.</p>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingProduct(null);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={isCreateOpen ? handleCreateSubmit : handleUpdateSubmit} className="p-6 space-y-4 flex-1">
              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Premium Cattle Feed"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {/* Product images */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Product Images</label>
                {editingProduct ? (
                  <>
                    {formImages.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formImages.map((img) => (
                          <div key={img.id} className="relative w-20 h-20 rounded-lg border border-gray-200 bg-white p-1 group">
                            <img src={img.url} alt="" className="w-full h-full object-contain" />
                            {img.isPrimary && (
                              <span className="absolute top-0.5 left-0.5 bg-brand text-white text-[8px] font-bold px-1 rounded">MAIN</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-1">
                              {!img.isPrimary && (
                                <button type="button" onClick={() => handleMakePrimary(img.id)} title="Set as main" className="p-1 bg-white rounded text-brand">
                                  <Star size={12} />
                                </button>
                              )}
                              <button type="button" onClick={() => handleRemoveImage(img.id)} title="Remove" className="p-1 bg-white rounded text-red-600">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mb-2">No images yet.</p>
                    )}
                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50">
                      {imgBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {imgBusy ? "Uploading…" : "Add image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={imgBusy}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddImage(f); e.target.value = ""; }}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 w-fit">
                      <Upload size={14} /> {pendingFile ? pendingFile.name : "Choose image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {pendingFile && <p className="text-[11px] text-gray-400 mt-1">Attached when you create the product.</p>}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">SKU</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. VMA-1002"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Regular Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formRegularPrice}
                    onChange={(e) => setFormRegularPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Sale Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formSalePrice}
                    onChange={(e) => setFormSalePrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Active Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div className="border-t border-gray-50 pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="manageStock"
                    checked={formManageStock}
                    onChange={(e) => setFormManageStock(e.target.checked)}
                    className="rounded text-brand focus:ring-brand"
                  />
                  <label htmlFor="manageStock" className="text-xs font-semibold text-gray-700">
                    Manage stock levels for this product
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formManageStock && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formStockQuantity}
                        onChange={(e) => setFormStockQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="e.g. 50"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                  )}
                  <div className={formManageStock ? "" : "sm:col-span-2"}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Stock Status
                    </label>
                    <select
                      value={formStockStatus}
                      onChange={(e) => setFormStockStatus(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                    >
                      <option value="IN_STOCK">In Stock</option>
                      <option value="OUT_OF_STOCK">Out of Stock</option>
                      <option value="ON_BACKORDER">On Backorder</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Bulk Bonus Offer (optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number" min="1" placeholder="Buy qty (e.g. 11)"
                      value={formBonusBuy}
                      onChange={(e) => setFormBonusBuy(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <input
                      type="number" min="1" placeholder="Free qty (e.g. 1)"
                      value={formBonusFree}
                      onChange={(e) => setFormBonusFree(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {formBonusBuy && formBonusFree
                    ? `Customers who buy ${formBonusBuy} get ${formBonusFree} extra free (repeats per multiple). Leave blank for no offer.`
                    : "e.g. 11 + 1 → buy 11, get 1 free. Leave both blank for no offer."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Product Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detail product features, ingredients, or dosage specifications..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="border-t border-gray-50 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-50"
                >
                  {isCreateOpen ? "Create Product" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
