"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDebounce } from "@/lib/hooks";
import { money } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import type { Product, Category, Paginated } from "@/lib/types";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const empty = {
  name: "",
  sku: "",
  categoryId: "",
  description: "",
  quantity: "0",
  unit: "pcs",
  costPrice: "0",
  sellPrice: "0",
  lowStockThreshold: "10",
};

export default function ProductsPage() {
  const { user, company } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";
  const currency = company?.currency || "USD";

  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Paginated<Product>>("/products", { query: { page, search: debouncedSearch, categoryId } });
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty });
    setImageFile(null);
    setModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId || "",
      description: p.description || "",
      quantity: String(p.quantity),
      unit: p.unit,
      costPrice: String(p.costPrice),
      sellPrice: String(p.sellPrice),
      lowStockThreshold: String(p.lowStockThreshold),
    });
    setImageFile(null);
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      if (form.sku) fd.append("sku", form.sku);
      if (form.categoryId) fd.append("categoryId", form.categoryId);
      if (form.description) fd.append("description", form.description);
      fd.append("unit", form.unit);
      fd.append("costPrice", form.costPrice);
      fd.append("sellPrice", form.sellPrice);
      fd.append("lowStockThreshold", form.lowStockThreshold);
      if (!editing) fd.append("quantity", form.quantity);
      if (imageFile) fd.append("image", imageFile);

      if (editing) {
        await api(`/products/${editing.id}`, { method: "PUT", body: fd, isForm: true });
        toast.success("Product updated");
      } else {
        await api("/products", { method: "POST", body: fd, isForm: true });
        toast.success("Product created");
      }
      setModal(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/products/${deleteId}`, { method: "DELETE" });
      toast.success("Product deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  }

  const items = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog"
        actions={isAdmin && <Button onClick={openCreate}><Plus size={16} /> New Product</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            className="pl-9"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <Select
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
          className="w-48"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Product</TH>
            <TH>SKU</TH>
            <TH>Category</TH>
            <TH>Stock</TH>
            <TH>Cost</TH>
            <TH>Price</TH>
            {isAdmin && <TH className="text-right">Actions</TH>}
          </TR>
        </THead>
        <TBody>
          {loading ? (
            <EmptyRow colSpan={7} message="Loading…" />
          ) : items.length === 0 ? (
            <EmptyRow colSpan={7} />
          ) : (
            items.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium text-zinc-900 dark:text-zinc-100">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-zinc-100 dark:bg-zinc-800" />}
                    {p.name}
                  </div>
                </TD>
                <TD className="font-mono text-xs">{p.sku}</TD>
                <TD>{p.category?.name || <span className="text-zinc-400">—</span>}</TD>
                <TD>
                  {p.quantity <= 0 ? (
                    <Badge tone="red">Out of stock</Badge>
                  ) : p.quantity <= p.lowStockThreshold ? (
                    <Badge tone="amber">{p.quantity} low</Badge>
                  ) : (
                    <span>{p.quantity} {p.unit}</span>
                  )}
                </TD>
                <TD>{money(p.costPrice, currency)}</TD>
                <TD>{money(p.sellPrice, currency)}</TD>
                {isAdmin && (
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(p.id)}><Trash2 size={14} className="text-red-500" /></Button>
                    </div>
                  </TD>
                )}
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Product" : "New Product"} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="SKU (auto if blank)"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated" /></Field>
            <Field label="Category">
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Uncategorized</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Unit"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            <Field label="Cost price"><Input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></Field>
            <Field label="Sell price"><Input type="number" step="0.01" min="0" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} /></Field>
            {!editing && <Field label="Initial quantity"><Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>}
            <Field label="Low-stock threshold"><Input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Image"><Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /></Field>
          {editing && <p className="text-xs text-zinc-400">Stock quantity is changed via Inventory adjustments, not here.</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} message="Delete this product?" />
    </div>
  );
}
