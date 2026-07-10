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

// GET /customers — search + paginate (both roles).
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
      prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.customer.count({ where }),
    ]);
    res.json(paginatedResult(data, total, page, limit));
  })
);

// GET /customers/:id — with purchase (sales) history.
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.auth.companyId },
      include: { sales: { orderBy: { createdAt: "desc" }, take: 50, include: { invoice: true } } },
    });
    if (!customer) throw ApiError.notFound("Customer not found");
    res.json(customer);
  })
);

// Both roles can create customers (needed at point of sale).
router.post(
  "/",
  validate(schema),
  asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (body.email === "") body.email = null;
    const customer = await prisma.customer.create({ data: { companyId: req.auth.companyId, ...body } });
    res.status(201).json(customer);
  })
);

router.put(
  "/:id",
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (body.email === "") body.email = null;
    const result = await prisma.customer.updateMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
      data: body,
    });
    if (result.count === 0) throw ApiError.notFound("Customer not found");
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    res.json(customer);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const result = await prisma.customer.deleteMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
    });
    if (result.count === 0) throw ApiError.notFound("Customer not found");
    res.json({ success: true });
  })
);

module.exports = router;
