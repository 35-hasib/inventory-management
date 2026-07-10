"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";

interface Point {
  day: string;
  total: number;
}

// Merge sales + purchases day series into one dataset keyed by day.
function mergeSeries(sales: Point[], purchases: Point[]) {
  const map = new Map<string, { day: string; sales: number; purchases: number }>();
  for (const s of sales) map.set(s.day, { day: s.day, sales: s.total, purchases: 0 });
  for (const p of purchases) {
    const e = map.get(p.day) || { day: p.day, sales: 0, purchases: 0 };
    e.purchases = p.total;
    map.set(p.day, e);
  }
  return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
}

export function SalesPurchaseChart({ sales, purchases }: { sales: Point[]; purchases: Point[] }) {
  const data = mergeSeries(sales, purchases);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="g-sales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-purchases" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#g-sales)" name="Sales" />
        <Area type="monotone" dataKey="purchases" stroke="#10b981" fill="url(#g-purchases)" name="Purchases" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({ data, dataKey, label }: { data: Record<string, unknown>[]; dataKey: string; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={dataKey} fill="#6366f1" name={label} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
