const express = require("express");
const prisma = require("../../config/prisma");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const { getPagination, paginatedResult } = require("../../utils/pagination");
const { checkAndNotifyStock } = require("../../utils/notify");

const router = express.Router();

// GET /inventory/movements — stock movement history (both roles).
router.get(
  "/movements",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = getPagination(req.query);
    const where = {
      companyId: req.auth.companyId,
      ...(req.query.productId ? { productId: req.query.productId } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { product: { select: { name: true, sku: true } } },
      }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json(paginatedResult(data, total, page, limit));
  })
);

// GET /inventory/low-stock — products at or below threshold.
router.get(
  "/low-stock",
  asyncHandler(async (req, res) => {
    const products = await prisma.$queryRaw`
      SELECT id, name, sku, quantity, "lowStockThreshold"
      FROM "Product"
      WHERE "companyId" = ${req.auth.companyId}
        AND "isActive" = true
        AND quantity <= "lowStockThreshold"
      ORDER BY quantity ASC
      LIMIT 100`;
    res.json(products);
  })
);

const adjustSchema = z.object({
  productId: z.string().min(1),
  // newQuantity sets an absolute count; quantityChange applies a delta. One required.
  newQuantity: z.coerce.number().int().min(0).optional(),
  quantityChange: z.coerce.number().int().optional(),
  note: z.string().max(255).optional(),
});

// POST /inventory/adjust — manual stock adjustment (ADMIN).
router.post(
  "/adjust",
  requireRole("ADMIN"),
  validate(adjustSchema),
  asyncHandler(async (req, res) => {
    const { companyId, userId } = req.auth;
    const { productId, newQuantity, quantityChange, note } = req.body;
    if (newQuantity === undefined && quantityChange === undefined) {
      throw ApiError.badRequest("Provide newQuantity or quantityChange");
    }

    const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
    if (!product) throw ApiError.notFound("Product not found");

    const target = newQuantity !== undefined ? newQuantity : product.quantity + quantityChange;
    if (target < 0) throw ApiError.badRequest("Resulting quantity cannot be negative");
    const delta = target - product.quantity;

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({ where: { id: productId }, data: { quantity: target } });
      await tx.stockMovement.create({
        data: {
          companyId,
          productId,
          type: "ADJUSTMENT",
          quantityChange: delta,
          balanceAfter: target,
          referenceType: "ADJUSTMENT",
          userId,
          note: note || "Manual adjustment",
        },
      });
      return p;
    });

    if (updated.quantity <= updated.lowStockThreshold) {
      await checkAndNotifyStock(companyId, updated);
    }
    res.json(updated);
  })
);

module.exports = router;
