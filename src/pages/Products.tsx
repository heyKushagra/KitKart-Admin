// Products page — searchable table with add / edit / delete and image upload.

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Upload, Package } from "lucide-react";
import { productsApi } from "../lib/api";
import type { Product } from "../lib/types";
import { useToast } from "../context/ToastContext";
import { Badge, statusTone } from "../components/Badge";
import { Modal } from "../components/Modal";
import { ConfirmModal } from "../components/ConfirmModal";
import { SearchInput } from "../components/SearchInput";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";

const emptyForm: Omit<Product, "id" | "createdAt"> = {
  name: "",
  team: "",
  category: "Football Jerseys",
  price: 0,
  stock: 0,
  sku: "",
  mainImage: "",
  optionalImages: [],
  status: "Out of Stock",
  tag: "",
  sizes: [],
  description: "",
};
const tags: Product["tag"][] = ["", "New", "Sale", "Hot", "Trendy", "IPL", "FIFA"];

export function Products() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [mainCategory, setMainCategory] = useState<"Jersey" | "Boots">("Jersey");
  const [subCategory, setSubCategory] = useState<string>("Football");

  function handleMainCategoryChange(val: "Jersey" | "Boots") {
    setMainCategory(val);
    if (val === "Boots") {
      setSubCategory("");
      setForm((f) => ({ ...f, category: "Football Boots" }));
    } else {
      setSubCategory("Football");
      setForm((f) => ({ ...f, category: "Football Jerseys" }));
    }
  }

  function handleSubCategoryChange(val: string) {
    setSubCategory(val);
    setForm((f) => ({ ...f, category: `${val} Jerseys` }));
  }

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = productsApi.subscribe((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter products by search query (name, team, sku, category).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.team, p.sku, p.category].some((field) => field.toLowerCase().includes(q))
    );
  }, [products, query]);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      category: "Football Jerseys",
    });
    setMainCategory("Jersey");
    setSubCategory("Football");
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    const { id, createdAt, ...rest } = product;
    void id; void createdAt;
    setForm({
      sizes: [],
      description: "",
      ...rest,
    });

    const cat = rest.category || "";
    const lower = cat.toLowerCase();
    if (lower.includes("boot")) {
      setMainCategory("Boots");
      setSubCategory("");
    } else {
      setMainCategory("Jersey");
      if (lower.includes("cricket")) {
        setSubCategory("Cricket");
      } else if (lower.includes("player")) {
        setSubCategory("Player");
      } else if (lower.includes("club")) {
        setSubCategory("Club");
      } else {
        setSubCategory("Football");
      }
    }
    setFormOpen(true);
  }

  // Compress image before saving to prevent hitting Firestore limits
  async function resizeImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const MAX = 800;
          if (width > height) {
            if (width > MAX) { height *= MAX / width; width = MAX; }
          } else {
            if (height > MAX) { width *= MAX / height; height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  // Convert an uploaded image file to a base64 data URL for preview/storage.
  async function handleImageUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const compressed = await resizeImage(file);
    setForm((f) => ({ ...f, mainImage: compressed }));
  }

  async function handleOptionalImagesUpload(files: FileList | null) {
    if (!files) return;
    const fileArray = Array.from(files);

    let errorShown = false;
    for (const file of fileArray) {
      if (file.size > 5 * 1024 * 1024) {
        if (!errorShown) {
          toast.error("Images must be under 5MB");
          errorShown = true;
        }
        continue;
      }
      const compressed = await resizeImage(file);
      setForm((f) => ({
        ...f,
        optionalImages: [...(f.optionalImages || []), compressed]
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || typeof form.price !== "number" || !form.category) {
      toast.error("Please fill in name, price and category");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await productsApi.update(editingId, form);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        toast.success("Product updated successfully");
      } else {
        const created = await productsApi.create(form);
        setProducts((prev) => [created, ...prev]);
        toast.success("Product added successfully");
      }
      setFormOpen(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productsApi.remove(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success("Product deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Could not delete product");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search products…" />
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No products found"
            description={query ? "Try a different search term." : "Add your first product to get started."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.mainImage || p.image || `${import.meta.env.BASE_URL}images/products/jersey1.jpg`}
                          alt={p.name}
                          className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">{p.name}</p>
                          <p className="truncate text-xs text-slate-400">{p.team} · {p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.category}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">Rs.{p.price.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className={p.stock === 0 ? "font-semibold text-rose-500" : "text-slate-600"}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                          aria-label="Edit product"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Edit Product" : "Add Product"}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setFormOpen(false)}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? <Spinner className="h-4 w-4 text-white" /> : <Package className="h-4 w-4" />}
              {editingId ? "Save Changes" : "Add Product"}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Main Image upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Main Image</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                {(form.mainImage || form.image) ? (
                  <img src={(form.mainImage || form.image)!} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <Upload className="h-6 w-6" />
                  </div>
                )}
              </div>
              <label className="cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-sky-400 hover:text-sky-600">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
                Upload image
              </label>
              {(form.mainImage || form.image) && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mainImage: "", image: "" }))}
                  className="text-xs font-medium text-rose-500 hover:text-rose-600"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Optional Images upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Optional Images</label>
            <div className="flex flex-wrap items-center gap-4">
              {form.optionalImages?.map((img, idx) => (
                <div key={idx} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 group">
                  <img src={img} alt={`Optional ${idx}`} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, optionalImages: f.optionalImages?.filter((_, i) => i !== idx) }))}
                      className="text-white hover:text-rose-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <label className="cursor-pointer flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-500 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600">
                <Upload className="h-5 w-5 mb-1 text-slate-400" />
                <span>Add</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleOptionalImagesUpload(e.target.files)}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Product Name" required>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
                placeholder="Red Devils Home Jersey"
              />
            </Field>
            <Field label="Team / Club">
              <input
                value={form.team}
                onChange={(e) => setForm({ ...form, team: e.target.value })}
                className="form-input"
                placeholder="Manchester United"
              />
            </Field>
            <Field label="Category" required>
              <select
                value={mainCategory}
                onChange={(e) => handleMainCategoryChange(e.target.value as "Jersey" | "Boots")}
                className="form-input"
              >
                <option value="Jersey">Jersey</option>
                <option value="Boots">Boots</option>
              </select>
            </Field>
            {mainCategory === "Jersey" && (
              <Field label="Sub Category" required>
                <select
                  value={subCategory}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  className="form-input"
                >
                  <option value="Football">Football</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Player">Player Version</option>
                  <option value="Club">Fan Version</option>
                  <option value="Retro">Retro Version</option>
                  <option value="Club">Master Version</option>

                </select>
              </Field>
            )}
            <div className="col-span-1 sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Available Sizes</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {["xs", "s", "m", "l", "xl", "xxl"].map((size) => {
                  const isChecked = form.sizes?.includes(size) || false;
                  return (
                    <label key={size} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const nextSizes = e.target.checked
                            ? [...(form.sizes || []), size]
                            : (form.sizes || []).filter((s) => s !== size);
                          setForm({ ...form, sizes: nextSizes });
                        }}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                      />
                      <span className="text-sm text-slate-700 uppercase">{size}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <Field label="SKU" >
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="form-input"
                placeholder="KIT-MU-001"
              />
            </Field>

            <Field label="Price (Rs.)" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="79.99"
              />
            </Field>
            <Field label="Stock" required>
              <input
                type="number"
                min="0"
                value={form.stock || ""}
                onChange={(e) => {
                  const stock = parseInt(e.target.value) || 0;
                  setForm({
                    ...form,
                    stock,
                    status: stock === 0 ? "Out of Stock" : "Active"
                  });
                }}
                className="form-input"
                placeholder="42"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Product["status"] })}
                className="form-input"
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </Field>
            <Field label="Tag">
              <select
                value={form.tag || ""}
                onChange={(e) => setForm({ ...form, tag: e.target.value as Product["tag"] })}
                className="form-input"
              >
                {tags.map((t) => (
                  <option key={t || "none"} value={t}>
                    {t || "None"}
                  </option>
                ))}
              </select>
            </Field>

            <div className="col-span-1 sm:col-span-2">
              <Field label="Product Description">
                <textarea
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="form-input min-h-[100px] py-2"
                  placeholder="Enter product details, material, care instructions, etc..."
                />
              </Field>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// Small helper for labelled form fields.
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}
