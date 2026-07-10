"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge, statusTone } from "@/components/ui/Badge";
import type { Purchase, Product, Contact, Paginated } from "@/lib/types";
import { Plus, Eye, Trash2 } from "lucide-react";

interface Line {
  productId: string;
  quantity: number;
  unitCost: number;
}

export default function PurchasesPage() {
  const { company } = useAuth();
  const toast = useToast();
  const currency = company?.currency || "USD";

  const [data, setData] = useState<Paginated<Purchase> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Contact[]>([]);

  const [modal, setModal] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1, unitCost: 0 }]);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Purchase | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<Purchase>>("/purchases", { query: { page } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setSupplierId("");
    setReference("");
    setNotes("");
    setLines([{ productId: "", quantity: 1, unitCost: 0 }]);
    setModal(true);
    if (products.length === 0) api<Paginated<Product>>("/products", { query: { limit: 100 } }).then((r) => setProducts(r.data)).catch(() => {});
    if (suppliers.length === 0) api<Paginated<Contact>>("/suppliers", { query: { limit: 100 } }).then((r) => setSuppliers(r.data)).catch(() => {});
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function onPickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateLine(i, { productId, unitCost: p ? Number(p.costPrice) : 0 });
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const items = lines.filter((l) => l.productId && l.quantity > 0);
    if (items.length === 0) return toast.error("Add at least one item");
    setSaving(true);
    try {
      await api("/purchases", { method: "POST", body: { supplierId: supplierId || null, reference, notes, items } });
      toast.success("Purchase recorded");
      setModal(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function viewDetail(id: string) {
    try {
      setDetail(await api<Purchase>(`/purchases/${id}`));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function cancel(id: string) {
    try {
      await api(`/purchases/${id}/cancel`, { method: "POST" });
      toast.success("Purchase cancelled");
      setDetail(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  const items = data?.data || [];

  return (
    <div>
      <PageHeader title="Purchases" subtitle="Record stock purchases from suppliers" actions={<Button onClick={openCreate}><Plus size={16} /> New Purchase</Button>} />

      <Table>
        <THead>
          <TR>
            <TH>Date</TH>
            <TH>Supplier</TH>
            <TH>Reference</TH>
            <TH>Items</TH>
            <TH>Total</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
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
                <TD>{formatDate(p.createdAt)}</TD>
                <TD>{p.supplier?.name || <span className="text-zinc-400">—</span>}</TD>
                <TD>{p.reference || <span className="text-zinc-400">—</span>}</TD>
                <TD>{p._count?.items ?? 0}</TD>
                <TD className="font-medium">{money(p.totalAmount, currency)}</TD>
                <TD><Badge tone={statusTone(p.status)}>{p.status}</Badge></TD>
                <TD className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => viewDetail(p.id)}><Eye size={14} /></Button>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}

      {/* Create modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Purchase" size="xl">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Supplier">
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">— None —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Reference"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO number, etc." /></Field>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Items</p>
            {lines.map((l, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={l.productId} onChange={(e) => onPickProduct(i, e.target.value)}>
                    <option value="">Select product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </Select>
                </div>
                <Input className="w-20" type="number" min="1" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} placeholder="Qty" />
                <Input className="w-28" type="number" step="0.01" min="0" value={l.unitCost} onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })} placeholder="Unit cost" />
                <span className="w-24 pb-2 text-right text-sm">{money(l.quantity * l.unitCost, currency)}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}><Trash2 size={14} className="text-red-500" /></Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { productId: "", quantity: 1, unitCost: 0 }])}><Plus size={14} /> Add item</Button>
          </div>

          <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

          <div className="flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <span className="text-lg font-semibold">Total: {money(total, currency)}</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Record Purchase</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Purchase Details" size="lg">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <div>
                <p className="text-zinc-500">Supplier</p>
                <p className="font-medium">{detail.supplier?.name || "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500">Date</p>
                <p>{formatDate(detail.createdAt)}</p>
              </div>
            </div>
            <Table>
              <THead><TR><TH>Product</TH><TH>Qty</TH><TH>Unit Cost</TH><TH>Total</TH></TR></THead>
              <TBody>
                {detail.items?.map((it) => (
                  <TR key={it.id}>
                    <TD>{it.product?.name}</TD>
                    <TD>{it.quantity}</TD>
                    <TD>{money(it.unitCost, currency)}</TD>
                    <TD>{money(it.lineTotal, currency)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex items-center justify-between pt-2">
              <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
              <span className="text-lg font-semibold">{money(detail.totalAmount, currency)}</span>
            </div>
            {detail.status === "RECEIVED" && (
              <div className="flex justify-end">
                <Button variant="danger" size="sm" onClick={() => cancel(detail.id)}>Cancel Purchase (reverse stock)</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
