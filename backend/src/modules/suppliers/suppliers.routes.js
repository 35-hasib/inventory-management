const express = require("express");
const prisma = require("../../config/prisma");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const { getPagination, paginatedResult } = require("../../utils/pagination");

const router = express.Router();

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
});

// GET /suppliers — search + paginate.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = getPagination(req.query);
    const search = (req.query.search || "").trim();
    const where = {
      companyId: req.auth.companyId,
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] }
        : {}),
    };
    const [data, total] = await Promise.all([
      prisma.supplier.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.supplier.count({ where }),
    ]);
    res.json(paginatedResult(data, total, page, limit));
  })
);

// GET /suppliers/:id — with purchase history.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.auth.companyId },
      include: { purchases: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
    if (!supplier) throw ApiError.notFound("Supplier not found");
    res.json(supplier);
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  validate(schema),
  asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (body.email === "") body.email = null;
    const supplier = await prisma.supplier.create({ data: { companyId: req.auth.companyId, ...body } });
    res.status(201).json(supplier);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN"),
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (body.email === "") body.email = null;
    const result = await prisma.supplier.updateMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
      data: body,
    });
    if (result.count === 0) throw ApiError.notFound("Supplier not found");
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    res.json(supplier);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const result = await prisma.supplier.deleteMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
    });
    if (result.count === 0) throw ApiError.notFound("Supplier not found");
    res.json({ success: true });
  })
);

module.exports = router;
