"use client";

import { useEffect, useState, useCallback } from "react";
import { api, downloadFile } from "@/lib/api";
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
import type { Sale, Product, Contact, Paginated } from "@/lib/types";
import { Plus, Eye, Trash2, Download } from "lucide-react";

interface Line {
  productId: string;
  quantity: number;
  unitPrice: number;
  max: number;
}

export default function SalesPage() {
  const { user, company } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";
  const currency = company?.currency || "USD";

  const [data, setData] = useState<Paginated<Sale> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);

  const [modal, setModal] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1, unitPrice: 0, max: 0 }]);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<Sale>>("/sales", { query: { page } }));
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
    setCustomerId("");
    setDiscount(0);
    setTax(0);
    setNotes("");
    setLines([{ productId: "", quantity: 1, unitPrice: 0, max: 0 }]);
    setModal(true);
    if (products.length === 0) api<Paginated<Product>>("/products", { query: { limit: 100 } }).then((r) => setProducts(r.data)).catch(() => { });
    if (customers.length === 0) api<Paginated<Contact>>("/customers", { query: { limit: 100 } }).then((r) => setCustomers(r.data)).catch(() => { });
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function onPickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateLine(i, { productId, unitPrice: p ? Number(p.sellPrice) : 0, max: p ? p.quantity : 0 });
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const total = Math.max(0, subtotal - discount + tax);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const items = lines.filter((l) => l.productId && l.quantity > 0).map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }));
    if (items.length === 0) return toast.error("Add at least one item");
    setSaving(true);
    try {
      await api("/sales", { method: "POST", body: { customerId: customerId || null, discount, tax, notes, items } });
      toast.success("Sale completed & invoice generated");
      setModal(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sale failed");
    } finally {
      setSaving(false);
    }
  }

  async function viewDetail(id: string) {
    try {
      setDetail(await api<Sale>(`/sales/${id}`));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function refund(id: string) {
    try {
      await api(`/sales/${id}/refund`, { method: "POST" });
      toast.success("Sale refunded & stock restored");
      setDetail(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
    }
  }

  async function downloadInvoice(invoiceId: string, number: string) {
    try {
      await downloadFile(`/invoices/${invoiceId}/pdf`, `${number}.pdf`);
    } catch {
      toast.error("Download failed");
    }
  }

  const items = data?.data || [];

  return (
    <div>
      <PageHeader title="Sales" subtitle="Create sales invoices and track orders" actions={<Button onClick={openCreate}><Plus size={16} /> New Sale</Button>} />

      <Table>
        <THead>
          <TR>
            <TH>Date</TH>
            <TH>Invoice</TH>
            <TH>Customer</TH>
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
            items.map((s) => (
              <TR key={s.id}>
                <TD>{formatDate(s.createdAt)}</TD>
                <TD className="font-mono text-xs">{s.invoice?.number || "—"}</TD>
                <TD>{s.customer?.name || <span className="text-zinc-400">Walk-in</span>}</TD>
                <TD>{s._count?.items ?? 0}</TD>
                <TD className="font-medium">{money(s.totalAmount, currency)}</TD>
                <TD><Badge tone={statusTone(s.status)}>{s.status}</Badge></TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    {s.invoice && <Button size="sm" variant="ghost" onClick={() => downloadInvoice(s.invoice!.id, s.invoice!.number)}><Download size={14} /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => viewDetail(s.id)}><Eye size={14} /></Button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}

      {/* Create modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Sale" size="xl">
        <form onSubmit={save} className="space-y-4">
          <Field label="Customer">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Items</p>
            {lines.map((l, i) => (
              <div key={i}>
                <div className="flex items-end gap-2 w-full">
                  <div className="flex-1 min-w-0">
                    <Select className="w-full" value={l.productId} onChange={(e) => onPickProduct(i, e.target.value)}>
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                          {p.name} ({p.quantity} in stock)
                        </option>
                      ))}
                    </Select>
                  </div>

                  <Input
                    className="flex-1 min-w-0"
                    type="number"
                    min="1"
                    max={l.max || undefined}
                    value={l.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                  />

                  <Input
                    className="flex-1 min-w-0"
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.unitPrice}
                    onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                  />

                  <div className="flex-1 min-w-0 flex items-center justify-between pb-1.5">
                    <span className="text-sm truncate">
                      {money(l.quantity * l.unitPrice, currency)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                </div>

                {l.max > 0 && l.quantity > l.max && (
                  <p className="pl-1 text-xs text-red-500">Only {l.max} in stock</p>
                )}
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { productId: "", quantity: 1, unitPrice: 0, max: 0 }])}><Plus size={14} /> Add item</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Discount"><Input type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></Field>
            <Field label="Tax"><Input type="number" step="0.01" min="0" value={tax} onChange={(e) => setTax(Number(e.target.value))} /></Field>
          </div>
          <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

          <div className="space-y-1 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
            <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span>{money(subtotal, currency)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Discount</span><span>-{money(discount, currency)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Tax</span><span>+{money(tax, currency)}</span></div>
            <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(total, currency)}</span></div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Complete Sale</Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Sale Details" size="lg">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <div>
                <p className="text-zinc-500">Customer</p>
                <p className="font-medium">{detail.customer?.name || "Walk-in"}</p>
                {detail.invoice && <p className="font-mono text-xs text-zinc-500">{detail.invoice.number}</p>}
              </div>
              <div className="text-right">
                <p className="text-zinc-500">Date</p>
                <p>{formatDate(detail.createdAt)}</p>
              </div>
            </div>
            <Table>
              <THead><TR><TH>Product</TH><TH>Qty</TH><TH>Unit Price</TH><TH>Total</TH></TR></THead>
              <TBody>
                {detail.items?.map((it) => (
                  <TR key={it.id}>
                    <TD>{it.product?.name}</TD>
                    <TD>{it.quantity}</TD>
                    <TD>{money(it.unitPrice, currency)}</TD>
                    <TD>{money(it.lineTotal, currency)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span>{money(detail.subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Discount</span><span>-{money(detail.discount, currency)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Tax</span><span>+{money(detail.tax, currency)}</span></div>
              <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(detail.totalAmount, currency)}</span></div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
              <div className="flex gap-2">
                {detail.invoice && <Button size="sm" variant="outline" onClick={() => downloadInvoice(detail.invoice!.id, detail.invoice!.number)}><Download size={14} /> Invoice PDF</Button>}
                {isAdmin && detail.status === "COMPLETED" && <Button size="sm" variant="danger" onClick={() => refund(detail.id)}>Refund</Button>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
