"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GridLayout from "../../(templates)/GridLayout";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  price: number | string;
  salePrice?: number | string | null;
  stock: number;
  type: "PHYSICAL" | "DIGITAL";
  digitalUrl?: string | null;
  active: boolean;
  category?: { name: string } | null;
  media?: unknown;
};

const EMPTY_PRODUCTS: AdminProduct[] = [];

const toOptionalNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

type AdminCategory = {
  id: string;
  name: string;
};

const EMPTY_CATEGORIES: AdminCategory[] = [];

type ProductFormState = {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  salePrice: string;
  stock: string;
  type: AdminProduct["type"];
  digitalUrl: string;
  mediaUrl: string;
  active: boolean;
};

type UploadState = {
  file: File | null;
  preview: string;
  uploading: boolean;
  error: string | null;
};

const toNumber = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) : value;
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const resolveMediaUrl = (media?: unknown) => {
  if (!media) return "";
  if (typeof media === "string") return media;
  if (Array.isArray(media)) return typeof media[0] === "string" ? media[0] : "";
  if (typeof media === "object") {
    const candidate = (media as { url?: unknown; image?: unknown; src?: unknown }).url ??
      (media as { image?: unknown }).image ??
      (media as { src?: unknown }).src;
    return typeof candidate === "string" ? candidate : "";
  }
  return "";
};

const emptyForm = (categoryId = ""): ProductFormState => ({
  name: "",
  slug: "",
  categoryId,
  price: "",
  salePrice: "",
  stock: "0",
  type: "PHYSICAL",
  digitalUrl: "",
  mediaUrl: "",
  active: true,
});

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [upload, setUpload] = useState<UploadState>({
    file: null,
    preview: "",
    uploading: false,
    error: null,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setUpload({ file, preview: previewUrl, uploading: false, error: null });

    // Auto-upload on select
    uploadFile(file, previewUrl);
  };

  const uploadFile = async (file: File, previewUrl: string) => {
    setUpload((prev) => ({ ...prev, uploading: true, error: null }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Upload failed");
      }

      setForm((prev) => ({ ...prev, mediaUrl: data.data.url }));
      setUpload((prev) => ({ ...prev, uploading: false, preview: previewUrl }));
    } catch (err) {
      setUpload((prev) => ({
        ...prev,
        uploading: false,
        error: err instanceof Error ? err.message : "Upload failed",
      }));
    }
  };

  const clearImage = () => {
    setUpload({ file: null, preview: "", uploading: false, error: null });
    setForm((prev) => ({ ...prev, mediaUrl: "" }));
  };

  const productsQuery = useQuery<AdminProduct[]>({
    queryKey: ["admin-products"],
    queryFn: () => apiFetch<AdminProduct[]>("/api/products"),
  });

  const categoriesQuery = useQuery<AdminCategory[]>({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<AdminCategory[]>("/api/categories"),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<AdminProduct>) =>
      apiFetch<AdminProduct>(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setEditingId(null);
      setForm(emptyForm(categoriesQuery.data?.[0]?.id ?? ""));
      clearImage();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/products/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const products = productsQuery.data ?? EMPTY_PRODUCTS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const errorMessage = productsQuery.isError
    ? productsQuery.error instanceof Error
      ? productsQuery.error.message
      : "Unable to load products."
    : null;

  useEffect(() => {
    if (!editingId && !form.categoryId && categories.length > 0) {
      setForm((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, editingId, form.categoryId]);
  const categoriesError = categoriesQuery.isError
    ? categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : "Unable to load categories."
    : null;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.slug.toLowerCase().includes(normalizedSearch) ||
        (product.category?.name ?? "").toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? product.active : !product.active);

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const formDisabled = saveMutation.isLoading || categories.length === 0;

  return (
    <GridLayout
      title="Products"
      actions={
        <div className="text-xs text-slate-500">
          <span>{filteredProducts.length}</span> <span>items shown</span>
        </div>
      }
    >
      <section className="card p-5 bg-white space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">
              {editingId ? "Edit product" : "New product"}
            </div>
            <div className="text-xs text-slate-500">Add, update, and publish products quickly.</div>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm(categoriesQuery.data?.[0]?.id ?? ""));
                clearImage();
              }}
              className="text-xs border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-50"
            >
              Cancel edit
            </button>
          )}
        </div>
        {!categoriesQuery.isLoading && categories.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Create a category before adding products.
          </div>
        )}
        {categoriesError && <div className="text-xs text-rose-600">{categoriesError}</div>}
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.categoryId) return;
            const payload = {
              name: form.name.trim(),
              slug: form.slug.trim(),
              categoryId: form.categoryId,
              price: Number(form.price),
              salePrice: toOptionalNumber(form.salePrice),
              stock: Number(form.stock || 0),
              type: form.type,
              digitalUrl: form.digitalUrl.trim() || undefined,
              media: form.mediaUrl.trim() ? [form.mediaUrl.trim()] : undefined,
              active: form.active,
            };
            saveMutation.mutate(payload);
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-500 space-y-1">
              <span>Name</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={() => {
                  if (!form.slug.trim()) {
                    setForm((prev) => ({ ...prev, slug: toSlug(prev.name) }));
                  }
                }}
                required
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Slug</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                required
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Category</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                required
                disabled={categories.length === 0}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Type</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    type: event.target.value as AdminProduct["type"],
                    digitalUrl: event.target.value === "DIGITAL" ? prev.digitalUrl : "",
                  }))
                }
              >
                <option value="PHYSICAL">Physical</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Price (GHS)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Sale price (optional)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.salePrice}
                onChange={(event) => setForm((prev) => ({ ...prev, salePrice: event.target.value }))}
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Stock</span>
              <input
                type="number"
                min="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.stock}
                onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
              />
            </label>
            <label className="text-xs text-slate-500 space-y-1">
              <span>Status</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.active ? "active" : "inactive"}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === "active" }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            {form.type === "DIGITAL" && (
              <label className="text-xs text-slate-500 space-y-1 md:col-span-2">
                <span>Digital URL</span>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.digitalUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, digitalUrl: event.target.value }))}
                  placeholder="https://"
                />
              </label>
            )}
            <div className="md:col-span-2 space-y-2">
              <span className="text-xs text-slate-500">Product image (optional)</span>
              <div className="flex items-start gap-3">
                {(upload.preview || form.mediaUrl) && (
                  <div className="relative">
                    <img
                      src={upload.preview || form.mediaUrl}
                      alt="Preview"
                      className="h-20 w-20 rounded-xl object-cover border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center hover:bg-slate-100 transition-colors">
                    {upload.uploading ? (
                      <span className="text-xs text-slate-500">Uploading…</span>
                    ) : (
                      <>
                        <span className="text-xs text-slate-600 font-medium">Click to upload</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WebP, GIF (max 5MB)</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
              {upload.error && <div className="text-xs text-rose-600">{upload.error}</div>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Price preview: <strong className="text-slate-900">{form.price ? formatCurrency(Number(form.price)) : "--"}</strong>
            </span>
            <span>
              Discounted: <strong className="text-slate-900">{form.salePrice ? formatCurrency(Number(form.salePrice)) : "No"}</strong>
            </span>
            <span>
              Stock: <strong className="text-slate-900">{form.stock || "0"}</strong>
            </span>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
              disabled={formDisabled}
            >
              {saveMutation.isLoading ? "Saving..." : editingId ? "Update product" : "Create product"}
            </button>
          </div>
        </form>
        {saveMutation.isError && (
          <div className="text-xs text-rose-600">Unable to save product. Please check the form.</div>
        )}
      </section>

      <section className="card p-5 bg-white space-y-3 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Product catalog</div>
            <div className="text-xs text-slate-500">Use filters to find and edit products faster.</div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="w-full sm:w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Search product or category"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {productsQuery.isLoading && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Loading products...</div>}
        {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{errorMessage}</div>}
        {!productsQuery.isLoading && !errorMessage && filteredProducts.length === 0 && (
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">No matching products found.</div>
        )}
        {!productsQuery.isLoading &&
          !errorMessage &&
          filteredProducts.map((product) => {
            const salePrice = toNumber(product.salePrice);
            const basePrice = toNumber(product.price);
            const priceValue = product.salePrice ? salePrice : basePrice;

            return (
              <div
                key={product.id}
                className={`rounded-2xl border p-4 space-y-3 ${
                  editingId === product.id ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs text-slate-500">{product.category?.name ?? "Uncategorized"}</div>
                    <div className="text-base font-semibold text-slate-900">{product.name}</div>
                    <div className="text-xs text-slate-400">/{product.slug}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {product.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span>
                    Price: <span className="font-semibold text-slate-900">{formatCurrency(priceValue)}</span>
                  </span>
                  {product.salePrice && (
                    <span className="text-xs text-slate-400 line-through">{formatCurrency(basePrice)}</span>
                  )}
                  <span className="text-xs text-slate-500">{product.type}</span>
                  <span className="text-xs text-slate-500">{product.stock} in stock</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="text-xs px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                    onClick={() => {
                      const mediaUrl = resolveMediaUrl(product.media);
                      setEditingId(product.id);
                      setForm({
                        name: product.name,
                        slug: product.slug,
                        categoryId: product.categoryId,
                        price: String(basePrice),
                        salePrice: product.salePrice ? String(salePrice) : "",
                        stock: String(product.stock),
                        type: product.type,
                        digitalUrl: product.digitalUrl ?? "",
                        mediaUrl,
                        active: product.active,
                      });
                      setUpload({
                        file: null,
                        preview: mediaUrl,
                        uploading: false,
                        error: null,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs px-3 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    onClick={() => deleteMutation.mutate(product.id)}
                    disabled={deleteMutation.isLoading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
      </section>

      {!productsQuery.isLoading && !errorMessage && products.length === 0 && (
        <div className="card p-4 bg-white text-sm text-slate-500 lg:col-span-4">No products yet.</div>
      )}
    </GridLayout>
  );
}
