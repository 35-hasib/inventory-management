"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/ui/Table";
import type { Category } from "@/lib/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function CategoriesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<Category[]>("/categories"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "" });
    setModal(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "" });
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api(`/categories/${editing.id}`, { method: "PUT", body: form });
        toast.success("Category updated");
      } else {
        await api("/categories", { method: "POST", body: form });
        toast.success("Category created");
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
      await api(`/categories/${deleteId}`, { method: "DELETE" });
      toast.success("Category deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Organize your products into categories"
        actions={isAdmin && <Button onClick={openCreate}><Plus size={16} /> New Category</Button>}
      />

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Description</TH>
            <TH>Products</TH>
            {isAdmin && <TH className="text-right">Actions</TH>}
          </TR>
        </THead>
        <TBody>
          {loading ? (
            <EmptyRow colSpan={4} message="Loading…" />
          ) : items.length === 0 ? (
            <EmptyRow colSpan={4} />
          ) : (
            items.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</TD>
                <TD>{c.description || <span className="text-zinc-400">—</span>}</TD>
                <TD>{c._count?.products ?? 0}</TD>
                {isAdmin && (
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(c.id)}><Trash2 size={14} className="text-red-500" /></Button>
                    </div>
                  </TD>
                )}
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Category" : "New Category"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} message="Delete this category? Products will be uncategorized." />
    </div>
  );
}
