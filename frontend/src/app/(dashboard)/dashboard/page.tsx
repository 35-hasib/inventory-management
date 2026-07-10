"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import type { DashboardData } from "@/lib/types";
import { StatCard, Card } from "@/components/ui/Card";
import { SalesPurchaseChart } from "@/components/charts/Charts";
import { Package, Users, Truck, ShoppingCart, Receipt, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const { company } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const currency = company?.currency || "USD";

  useEffect(() => {
    api<DashboardData>("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Sales" value={money(data.totals.sales, currency)} icon={<Receipt size={20} />} iconClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950" />
        <StatCard label="Total Purchases" value={money(data.totals.purchases, currency)} icon={<ShoppingCart size={20} />} iconClass="bg-green-50 text-green-600 dark:bg-green-950" />
        <StatCard label="Products" value={data.counts.products} icon={<Package size={20} />} iconClass="bg-amber-50 text-amber-600 dark:bg-amber-950" />
        <StatCard label="Customers" value={data.counts.customers} icon={<Users size={20} />} iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Suppliers" value={data.counts.suppliers} icon={<Truck size={20} />} iconClass="bg-zinc-100 text-zinc-600 dark:bg-zinc-800" />
        <StatCard label="Categories" value={data.counts.categories} icon={<Package size={20} />} iconClass="bg-zinc-100 text-zinc-600 dark:bg-zinc-800" />
        <StatCard label="Sales Orders" value={data.counts.salesCount} icon={<Receipt size={20} />} iconClass="bg-zinc-100 text-zinc-600 dark:bg-zinc-800" />
        <StatCard label="Purchase Orders" value={data.counts.purchaseCount} icon={<ShoppingCart size={20} />} iconClass="bg-zinc-100 text-zinc-600 dark:bg-zinc-800" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Sales vs Purchases (last 14 days)</h2>
          <SalesPurchaseChart sales={data.series.sales} purchases={data.series.purchases} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Low-stock alerts</h2>
          </div>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-zinc-400">All products are sufficiently stocked.</p>
          ) : (
            <ul className="space-y-2">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/40">
                  <div>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.sku}</p>
                  </div>
                  <span className={`font-semibold ${p.quantity <= 0 ? "text-red-600" : "text-amber-600"}`}>{p.quantity} left</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/inventory" className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:underline">
            Manage inventory →
          </Link>
        </Card>
      </div>
    </div>
  );
}
