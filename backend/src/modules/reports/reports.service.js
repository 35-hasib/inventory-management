const { Prisma } = require("@prisma/client");
const prisma = require("../../config/prisma");

function range(query) {
  // Parse a date param, treating empty / "undefined" / "null" / invalid values as absent.
  const parse = (v) => {
    if (!v || v === "undefined" || v === "null") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const to = parse(query.to) || new Date();
  const from = parse(query.from) || new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  // Include the whole 'to' day.
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function bucket(groupBy) {
  return groupBy === "month" ? "month" : "day";
}

async function salesReport(companyId, query) {
  const { from, to } = range(query);
  const unit = bucket(query.groupBy);
  const rows = await prisma.$queryRaw`
    SELECT to_char(date_trunc(${unit}, "createdAt"), 'YYYY-MM-DD') AS period,
           COUNT(*)::int AS orders,
           COALESCE(SUM("totalAmount"), 0)::float AS revenue
    FROM "Sale"
    WHERE "companyId" = ${companyId} AND status = 'COMPLETED'
      AND "createdAt" BETWEEN ${from} AND ${to}
    GROUP BY 1 ORDER BY 1`;
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  return { from, to, groupBy: unit, rows, summary: { totalRevenue, totalOrders } };
}

async function purchasesReport(companyId, query) {
  const { from, to } = range(query);
  const unit = bucket(query.groupBy);
  const rows = await prisma.$queryRaw`
    SELECT to_char(date_trunc(${unit}, "createdAt"), 'YYYY-MM-DD') AS period,
           COUNT(*)::int AS orders,
           COALESCE(SUM("totalAmount"), 0)::float AS cost
    FROM "Purchase"
    WHERE "companyId" = ${companyId} AND status = 'RECEIVED'
      AND "createdAt" BETWEEN ${from} AND ${to}
    GROUP BY 1 ORDER BY 1`;
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  return { from, to, groupBy: unit, rows, summary: { totalCost, totalOrders } };
}

async function inventoryReport(companyId) {
  const rows = await prisma.$queryRaw`
    SELECT p.id, p.name, p.sku, p.quantity, p.unit,
           p."costPrice"::float AS cost_price,
           p."sellPrice"::float AS sell_price,
           (p.quantity * p."costPrice")::float AS stock_value,
           c.name AS category
    FROM "Product" p
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE p."companyId" = ${companyId}
    ORDER BY stock_value DESC`;
  const totalValue = rows.reduce((s, r) => s + r.stock_value, 0);
  const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);
  const lowStock = rows.filter((r) => r.quantity <= 0).length;
  return { rows, summary: { totalValue, totalUnits, productCount: rows.length, outOfStock: lowStock } };
}

async function profitLossReport(companyId, query) {
  const { from, to } = range(query);
  const unit = bucket(query.groupBy);
  const rows = await prisma.$queryRaw`
    SELECT to_char(date_trunc(${unit}, s."createdAt"), 'YYYY-MM-DD') AS period,
           COALESCE(SUM(si."lineTotal"), 0)::float AS revenue,
           COALESCE(SUM(si."unitCostAtSale" * si.quantity), 0)::float AS cogs,
           COALESCE(SUM(si."lineTotal" - si."unitCostAtSale" * si.quantity), 0)::float AS profit
    FROM "Sale" s
    JOIN "SaleItem" si ON si."saleId" = s.id
    WHERE s."companyId" = ${companyId} AND s.status = 'COMPLETED'
      AND s."createdAt" BETWEEN ${from} AND ${to}
    GROUP BY 1 ORDER BY 1`;
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const cogs = rows.reduce((s, r) => s + r.cogs, 0);
  const profit = rows.reduce((s, r) => s + r.profit, 0);
  return { from, to, groupBy: unit, rows, summary: { revenue, cogs, profit, margin: revenue ? profit / revenue : 0 } };
}

module.exports = { salesReport, purchasesReport, inventoryReport, profitLossReport };
