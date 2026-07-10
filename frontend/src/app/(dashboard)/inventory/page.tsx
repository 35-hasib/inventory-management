"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import type { StockMovement, Product, Paginated } from "@/lib/types";
import { Sliders } from "lucide-react";

const TYPE_TONE: Record<string, "green" | "red" | "amber" | "blue" | "gray"> = {
  PURCHASE: "green",
  RETURN_IN: "green",
  INITIAL: "blue",
  SALE: "red",
  RETURN_OUT: "red",
  ADJUSTMENT: "amber",
};

export default function InventoryPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [data, setData] = useState<Paginated<StockMovement> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState(false);
  const [productId, setProductId] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<StockMovement>>("/inventory/movements", { query: { page } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdjust() {
    setProductId("");
    setNewQuantity("");
    setNote("");
    setModal(true);
    if (products.length === 0) api<Paginated<Product>>("/products", { query: { limit: 100 } }).then((r) => setProducts(r.data)).catch(() => {});
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return toast.error("Select a product");
    setSaving(true);
    try {
      await api("/inventory/adjust", { method: "POST", body: { productId, newQuantity: Number(newQuantity), note } });
      toast.success("Stock adjusted");
      setModal(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Adjust failed");
    } finally {
      setSaving(false);
    }
  }

  const items = data?.data || [];
  const selected = products.find((p) => p.id === productId);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Track stock movements and adjust levels"
        actions={isAdmin && <Button onClick={openAdjust}><Sliders size={16} /> Adjust Stock</Button>}
      />

      <Table>
        <THead>
          <TR>
            <TH>Date</TH>
            <TH>Product</TH>
            <TH>Type</TH>
            <TH>Change</TH>
            <TH>Balance</TH>
            <TH>Note</TH>
          </TR>
        </THead>
        <TBody>
          {loading ? (
            <EmptyRow colSpan={6} message="Loading…" />
          ) : items.length === 0 ? (
            <EmptyRow colSpan={6} />
          ) : (
            items.map((m) => (
              <TR key={m.id}>
                <TD className="whitespace-nowrap">{formatDateTime(m.createdAt)}</TD>
                <TD>{m.product?.name} <span className="text-xs text-zinc-400">{m.product?.sku}</span></TD>
                <TD><Badge tone={TYPE_TONE[m.type] || "gray"}>{m.type}</Badge></TD>
                <TD className={m.quantityChange >= 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>
                  {m.quantityChange >= 0 ? "+" : ""}{m.quantityChange}
                </TD>
                <TD>{m.balanceAfter}</TD>
                <TD>{m.note || <span className="text-zinc-400">—</span>}</TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}

      <Modal open={modal} onClose={() => setModal(false)} title="Adjust Stock">
        <form onSubmit={save} className="space-y-4">
          <Field label="Product">
            <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} (current: {p.quantity})</option>)}
            </Select>
          </Field>
          {selected && <p className="text-xs text-zinc-500">Current quantity: {selected.quantity}</p>}
          <Field label="New quantity">
            <Input type="number" min="0" required value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
          </Field>
          <Field label="Reason / note">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Stock count correction, damage, etc." />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Apply</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
