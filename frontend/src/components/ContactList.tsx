"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useDebounce } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import type { Contact, Paginated } from "@/lib/types";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const empty = { name: "", email: "", phone: "", address: "" };

// Shared CRUD UI for suppliers and customers (same shape).
export function ContactList({
  resource,
  title,
  subtitle,
  canCreate,
}: {
  resource: "suppliers" | "customers";
  title: string;
  subtitle: string;
  canCreate: boolean; // who may create/edit
}) {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [data, setData] = useState<Paginated<Contact> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<Contact>>(`/${resource}`, { query: { page, search: debouncedSearch } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [resource, page, debouncedSearch, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty });
    setModal(true);
  }
  function openEdit(c: Contact) {
    setEditing(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "" });
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api(`/${resource}/${editing.id}`, { method: "PUT", body: form });
        toast.success("Updated");
      } else {
        await api(`/${resource}`, { method: "POST", body: form });
        toast.success("Created");
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
      await api(`/${resource}/${deleteId}`, { method: "DELETE" });
      toast.success("Deleted");
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
        title={title}
        subtitle={subtitle}
        actions={canCreate && <Button onClick={openCreate}><Plus size={16} /> New</Button>}
      />

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input className="pl-9" placeholder="Search…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Phone</TH>
            <TH>Address</TH>
            {canCreate && <TH className="text-right">Actions</TH>}
          </TR>
        </THead>
        <TBody>
          {loading ? (
            <EmptyRow colSpan={5} message="Loading…" />
          ) : items.length === 0 ? (
            <EmptyRow colSpan={5} />
          ) : (
            items.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</TD>
                <TD>{c.email || <span className="text-zinc-400">—</span>}</TD>
                <TD>{c.phone || <span className="text-zinc-400">—</span>}</TD>
                <TD>{c.address || <span className="text-zinc-400">—</span>}</TD>
                {canCreate && (
                  <TD className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                      {isAdmin && <Button size="sm" variant="ghost" onClick={() => setDeleteId(c.id)}><Trash2 size={14} className="text-red-500" /></Button>}
                    </div>
                  </TD>
                )}
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${title.slice(0, -1)}` : `New ${title.slice(0, -1)}`}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Update" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} message="Delete this record?" />
    </div>
  );
}
