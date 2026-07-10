const express = require("express");
const prisma = require("../../config/prisma");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");

const router = express.Router();

const schema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
});

// GET /categories — list with product counts (both roles).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { companyId: req.auth.companyId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    res.json(categories);
  })
);

// POST /categories (ADMIN)
router.post(
  "/",
  requireRole("ADMIN"),
  validate(schema),
  asyncHandler(async (req, res) => {
    const category = await prisma.category.create({
      data: { companyId: req.auth.companyId, name: req.body.name, description: req.body.description },
    });
    res.status(201).json(category);
  })
);

// PUT /categories/:id (ADMIN)
router.put(
  "/:id",
  requireRole("ADMIN"),
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    const result = await prisma.category.updateMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
      data: req.body,
    });
    if (result.count === 0) throw ApiError.notFound("Category not found");
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    res.json(category);
  })
);

// DELETE /categories/:id (ADMIN)
router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const result = await prisma.category.deleteMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
    });
    if (result.count === 0) throw ApiError.notFound("Category not found");
    res.json({ success: true });
  })
);

module.exports = router;
