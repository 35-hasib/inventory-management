const express = require("express");
const prisma = require("../../config/prisma");
const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

// GET /dashboard — summary counts, totals, low-stock alerts, and 14-day series.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const companyId = req.auth.companyId;

    const [
      productCount,
      customerCount,
      supplierCount,
      categoryCount,
      salesAgg,
      purchaseAgg,
      lowStock,
      recentSales,
    ] = await Promise.all([
      prisma.product.count({ where: { companyId } }),
      prisma.customer.count({ where: { companyId } }),
      prisma.supplier.count({ where: { companyId } }),
      prisma.category.count({ where: { companyId } }),
      prisma.sale.aggregate({
        where: { companyId, status: "COMPLETED" },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.purchase.aggregate({
        where: { companyId, status: "RECEIVED" },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT id, name, sku, quantity, "lowStockThreshold"
        FROM "Product"
        WHERE "companyId" = ${companyId} AND "isActive" = true AND quantity <= "lowStockThreshold"
        ORDER BY quantity ASC LIMIT 10`,
      prisma.$queryRaw`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
               COALESCE(SUM("totalAmount"), 0)::float AS total
        FROM "Sale"
        WHERE "companyId" = ${companyId}
          AND "createdAt" >= now() - interval '14 days'
          AND status = 'COMPLETED'
        GROUP BY 1 ORDER BY 1`,
    ]);

    const recentPurchases = await prisma.$queryRaw`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
             COALESCE(SUM("totalAmount"), 0)::float AS total
      FROM "Purchase"
      WHERE "companyId" = ${companyId}
        AND "createdAt" >= now() - interval '14 days'
        AND status = 'RECEIVED'
      GROUP BY 1 ORDER BY 1`;

    res.json({
      counts: {
        products: productCount,
        customers: customerCount,
        suppliers: supplierCount,
        categories: categoryCount,
        salesCount: salesAgg._count,
        purchaseCount: purchaseAgg._count,
      },
      totals: {
        sales: Number(salesAgg._sum.totalAmount || 0),
        purchases: Number(purchaseAgg._sum.totalAmount || 0),
      },
      lowStock,
      series: { sales: recentSales, purchases: recentPurchases },
    });
  })
);

module.exports = router;
