"use client";

import { useEffect, useState, useCallback } from "react";
import { api, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import type { Invoice, Paginated } from "@/lib/types";
import { Download } from "lucide-react";

export default function InvoicesPage() {
  const { company } = useAuth();
  const toast = useToast();
  const currency = company?.currency || "USD";

  const [data, setData] = useState<Paginated<Invoice> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<Paginated<Invoice>>("/invoices", { query: { page } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function download(inv: Invoice) {
    try {
      await downloadFile(`/invoices/${inv.id}/pdf`, `${inv.number}.pdf`);
    } catch {
      toast.error("Download failed");
    }
  }

  const items = data?.data || [];

  return (
    <div>
      <PageHeader title="Invoices" subtitle="All generated sales invoices" />

      <Table>
        <THead>
          <TR>
            <TH>Invoice #</TH>
            <TH>Date</TH>
            <TH>Customer</TH>
            <TH>Amount</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {loading ? (
            <EmptyRow colSpan={5} message="Loading…" />
          ) : items.length === 0 ? (
            <EmptyRow colSpan={5} />
          ) : (
            items.map((inv) => (
              <TR key={inv.id}>
                <TD className="font-mono text-xs font-medium">{inv.number}</TD>
                <TD>{formatDate(inv.issuedAt)}</TD>
                <TD>{inv.sale?.customer?.name || <span className="text-zinc-400">Walk-in</span>}</TD>
                <TD className="font-medium">{money(inv.totalAmount, currency)}</TD>
                <TD className="text-right">
                  <Button size="sm" variant="outline" onClick={() => download(inv)}><Download size={14} /> PDF</Button>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />}
    </div>
  );
}
