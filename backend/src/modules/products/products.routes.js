const express = require("express");
const prisma = require("../../config/prisma");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const planLimit = require("../../middleware/planLimit");
const { upload } = require("../../middleware/upload");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const { getPagination, paginatedResult } = require("../../utils/pagination");

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1).max(160),
  sku: z.string().min(1).max(60).optional(),
  categoryId: z.string().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  unit: z.string().max(20).default("pcs"),
  costPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(10),
  isActive: z.coerce.boolean().default(true),
});

// Generate a unique SKU per company: SKU-XXXXXX.
async function generateSku(companyId) {
  for (let i = 0; i < 10; i++) {
    const candidate = `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const exists = await prisma.product.findUnique({
      where: { companyId_sku: { companyId, sku: candidate } },
    });
    if (!exists) return candidate;
  }
  return `SKU-${Date.now().toString(36).toUpperCase()}`;
}

function imageUrl(req, file) {
  if (!file) return undefined;
  return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
}

// GET /products — search, filter by category, paginate.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = getPagination(req.query);
    const search = (req.query.search || "").trim();
    const where = {
      companyId: req.auth.companyId,
      ...(req.query.categoryId ? { categoryId: req.query.categoryId } : {}),
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] }
        : {}),
    };
    const [data, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { category: true } }),
      prisma.product.count({ where }),
    ]);
    res.json(paginatedResult(data, total, page, limit));
  })
);

// GET /products/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.auth.companyId },
      include: { category: true },
    });
    if (!product) throw ApiError.notFound("Product not found");
    res.json(product);
  })
);

// POST /products (ADMIN) — multipart for optional image.
router.post(
  "/",
  requireRole("ADMIN"),
  planLimit("products"),
  upload.single("image"),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { companyId } = req.auth;
    const sku = req.body.sku || (await generateSku(companyId));

    if (req.body.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: req.body.categoryId, companyId } });
      if (!cat) throw ApiError.badRequest("Invalid category");
    }

    const product = await prisma.product.create({
      data: {
        companyId,
        name: req.body.name,
        sku,
        categoryId: req.body.categoryId || null,
        description: req.body.description || null,
        quantity: req.body.quantity,
        unit: req.body.unit,
        costPrice: req.body.costPrice,
        sellPrice: req.body.sellPrice,
        lowStockThreshold: req.body.lowStockThreshold,
        isActive: req.body.isActive,
        imageUrl: imageUrl(req, req.file) || null,
      },
    });

    // Seed an INITIAL stock movement when starting with stock.
    if (product.quantity > 0) {
      await prisma.stockMovement.create({
        data: {
          companyId,
          productId: product.id,
          type: "INITIAL",
          quantityChange: product.quantity,
          balanceAfter: product.quantity,
          userId: req.auth.userId,
          note: "Initial stock",
        },
      });
    }

    res.status(201).json(product);
  })
);

// PUT /products/:id (ADMIN) — does NOT directly change quantity (use inventory adjustments).
router.put(
  "/:id",
  requireRole("ADMIN"),
  upload.single("image"),
  validate(createSchema.partial()),
  asyncHandler(async (req, res) => {
    const { companyId } = req.auth;
    const data = {};
    for (const k of ["name", "sku", "description", "unit", "costPrice", "sellPrice", "lowStockThreshold", "isActive", "categoryId"]) {
      if (req.body[k] !== undefined) data[k] = req.body[k] === "" ? null : req.body[k];
    }
    const img = imageUrl(req, req.file);
    if (img) data.imageUrl = img;

    const result = await prisma.product.updateMany({ where: { id: req.params.id, companyId }, data });
    if (result.count === 0) throw ApiError.notFound("Product not found");
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { category: true } });
    res.json(product);
  })
);

// DELETE /products/:id (ADMIN)
router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const result = await prisma.product.deleteMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
    });
    if (result.count === 0) throw ApiError.notFound("Product not found");
    res.json({ success: true });
  })
);

module.exports = router;
