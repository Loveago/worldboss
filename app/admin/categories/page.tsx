"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GridLayout from "../../(templates)/GridLayout";
import { apiFetch } from "@/lib/api-client";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Array<{ id: string }>;
};

const EMPTY_CATEGORIES: AdminCategory[] = [];

type CategoryFormState = {
  name: string;
  slug: string;
  parentId: string;
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const emptyForm = (parentId = ""): CategoryFormState => ({
  name: "",
  slug: "",
  parentId,
});

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm());
  const [search, setSearch] = useState("");

  const categoriesQuery = useQuery<AdminCategory[]>({
    queryKey: ["admin-categories"],
    queryFn: () => apiFetch<AdminCategory[]>("/api/categories"),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: CategoryFormState) =>
      apiFetch<AdminCategory>(editingId ? `/api/categories/${editingId}` : "/api/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name.trim(),
          slug: payload.slug.trim(),
          parentId: payload.parentId || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setEditingId(null);
      setForm(emptyForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/categories/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const errorMessage = categoriesQuery.isError
    ? categoriesQuery.error instanceof Error
      ? categoriesQuery.error.message
      : "Unable to load categories."
    : null;

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return categories;

    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.slug.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [categories, search]);

  return (
    <GridLayout
      title="Categories"
      actions={
        <div className="text-xs text-slate-500">
          <span>{filteredCategories.length}</span> <span>shown</span>
        </div>
      }
    >
      <section className="card p-5 bg-white space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">
              {editingId ? "Edit category" : "New category"}
            </div>
            <div className="text-xs text-slate-500">Create collections and subcategories for cleaner navigation.</div>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
              className="text-xs border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-50"
            >
              Cancel edit
            </button>
          )}
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate(form);
          }}
        >
          <div className="grid gap-3 md:grid-cols-3">
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
              <span>Parent (optional)</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.parentId}
                onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
              >
                <option value="">No parent</option>
                {categories
                  .filter((category) => category.id !== editingId)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>
              Slug preview: <strong className="text-slate-900">/{form.slug || toSlug(form.name) || "category-name"}</strong>
            </span>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
              disabled={saveMutation.isLoading}
            >
              {saveMutation.isLoading ? "Saving..." : editingId ? "Update category" : "Create category"}
            </button>
          </div>
        </form>
        {saveMutation.isError && (
          <div className="text-xs text-rose-600">Unable to save category. Please check the form.</div>
        )}
      </section>

      <section className="card p-5 bg-white space-y-3 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Category list</div>
            <div className="text-xs text-slate-500">Find categories fast and edit them in one click.</div>
          </div>
          <input
            className="w-full sm:w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search by name or slug"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {categoriesQuery.isLoading && <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">Loading categories...</div>}
        {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{errorMessage}</div>}
        {!categoriesQuery.isLoading && !errorMessage && filteredCategories.length === 0 && (
          <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">No matching categories found.</div>
        )}
        {!categoriesQuery.isLoading &&
          !errorMessage &&
          filteredCategories.map((category) => (
            <div
              key={category.id}
              className={`rounded-2xl border p-4 space-y-2 ${
                editingId === category.id ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{category.parentId ? "Subcategory" : "Top level"}</span>
                <span>{category.children?.length ?? 0} subcategories</span>
              </div>
              <div className="text-base font-semibold text-slate-900">{category.name}</div>
              <div className="text-sm text-slate-600">/{category.slug}</div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  className="text-xs px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                  onClick={() => {
                    setEditingId(category.id);
                    setForm({
                      name: category.name,
                      slug: category.slug,
                      parentId: category.parentId ?? "",
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  className="text-xs px-3 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() => deleteMutation.mutate(category.id)}
                  disabled={deleteMutation.isLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </section>

      {!categoriesQuery.isLoading && !errorMessage && categories.length === 0 && (
        <div className="card p-4 bg-white text-sm text-slate-500 lg:col-span-4">No categories yet.</div>
      )}
    </GridLayout>
  );
}
