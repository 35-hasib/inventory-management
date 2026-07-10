"use client";

import { useEffect, useState, useCallback } from "react";
import { api, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/ui/Table";
import { SimpleBarChart } from "@/components/charts/Charts";
import { FileSpreadsheet, FileText } from "lucide-react";

type ReportType = "sales" | "purchases" | "inventory" | "profit-loss";

const TYPES: { value: ReportType; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "purchases", label: "Purchases" },
  { value: "inventory", label: "Inventory" },
  { value: "profit-loss", label: "Profit / Loss" },
];

export default function ReportsPage() {
  const { company } = useAuth();
  const toast = useToast();
  const currency = company?.currency || "USD";

  const [type, setType] = useState<ReportType>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const query = useCallback(
    () => ({ from: from || undefined, to: to || undefined, groupBy }),
    [from, to, groupBy]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await api(`/reports/${type}`, { query: query() }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [type, query, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function exportReport(format: "excel" | "pdf") {
    try {
      const params = new URLSearchParams();
      Object.entries({ ...query(), format }).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
      });
      await downloadFile(`/reports/${type}/export?${params.toString()}`, `${type}-report.${format === "excel" ? "xlsx" : "pdf"}`);
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Analyze sales, purchases, inventory and profitability"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportReport("excel")}><FileSpreadsheet size={16} /> Excel</Button>
            <Button variant="outline" onClick={() => exportReport("pdf")}><FileText size={16} /> PDF</Button>
          </div>
        }
      />

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Report">
            <Select value={type} onChange={(e) => setType(e.target.value as ReportType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          {type !== "inventory" && (
            <>
              <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
              <Field label="Group by">
                <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </Select>
              </Field>
            </>
          )}
        </div>
      </Card>

      {loading || !report ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : type === "inventory" ? (
        <InventoryReport report={report} currency={currency} />
      ) : type === "profit-loss" ? (
        <ProfitLossReport report={report} currency={currency} />
      ) : (
        <PeriodReport report={report} type={type} currency={currency} />
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function Summary({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((s) => (
        <Card key={s.label}>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</p>
          <p className="text-xl font-semibold">{s.value}</p>
        </Card>
      ))}
    </div>
  );
}

function PeriodReport({ report, type, currency }: { report: any; type: string; currency: string }) {
  const valueKey = type === "sales" ? "revenue" : "cost";
  return (
    <div>
      <Summary
        items={[
          { label: "Orders", value: String(report.summary.totalOrders) },
          { label: type === "sales" ? "Revenue" : "Cost", value: money(type === "sales" ? report.summary.totalRevenue : report.summary.totalCost, currency) },
        ]}
      />
      <Card className="mb-4"><SimpleBarChart data={report.rows} dataKey={valueKey} label={type === "sales" ? "Revenue" : "Cost"} /></Card>
      <Table>
        <THead><TR><TH>Period</TH><TH>Orders</TH><TH>{type === "sales" ? "Revenue" : "Cost"}</TH></TR></THead>
        <TBody>
          {report.rows.length === 0 ? <EmptyRow colSpan={3} /> : report.rows.map((r: any) => (
            <TR key={r.period}><TD>{r.period}</TD><TD>{r.orders}</TD><TD>{money(r[valueKey], currency)}</TD></TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function ProfitLossReport({ report, currency }: { report: any; currency: string }) {
  return (
    <div>
      <Summary
        items={[
          { label: "Revenue", value: money(report.summary.revenue, currency) },
          { label: "COGS", value: money(report.summary.cogs, currency) },
          { label: "Profit", value: money(report.summary.profit, currency) },
          { label: "Margin", value: `${(report.summary.margin * 100).toFixed(1)}%` },
        ]}
      />
      <Card className="mb-4"><SimpleBarChart data={report.rows} dataKey="profit" label="Profit" /></Card>
      <Table>
        <THead><TR><TH>Period</TH><TH>Revenue</TH><TH>COGS</TH><TH>Profit</TH></TR></THead>
        <TBody>
          {report.rows.length === 0 ? <EmptyRow colSpan={4} /> : report.rows.map((r: any) => (
            <TR key={r.period}><TD>{r.period}</TD><TD>{money(r.revenue, currency)}</TD><TD>{money(r.cogs, currency)}</TD><TD className={r.profit >= 0 ? "text-green-600" : "text-red-600"}>{money(r.profit, currency)}</TD></TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function InventoryReport({ report, currency }: { report: any; currency: string }) {
  return (
    <div>
      <Summary
        items={[
          { label: "Products", value: String(report.summary.productCount) },
          { label: "Total Units", value: String(report.summary.totalUnits) },
          { label: "Stock Value", value: money(report.summary.totalValue, currency) },
          { label: "Out of Stock", value: String(report.summary.outOfStock) },
        ]}
      />
      <Table>
        <THead><TR><TH>Product</TH><TH>SKU</TH><TH>Category</TH><TH>Qty</TH><TH>Stock Value</TH></TR></THead>
        <TBody>
          {report.rows.length === 0 ? <EmptyRow colSpan={5} /> : report.rows.map((r: any) => (
            <TR key={r.id}><TD>{r.name}</TD><TD className="font-mono text-xs">{r.sku}</TD><TD>{r.category || "—"}</TD><TD>{r.quantity}</TD><TD>{money(r.stock_value, currency)}</TD></TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
