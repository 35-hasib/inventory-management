const express = require("express");
const prisma = require("../../config/prisma");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  currency: z.string().min(1).max(8).optional(),
  invoicePrefix: z.string().min(1).max(12).optional(),
});

// GET /company — current tenant profile.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({ where: { id: req.auth.companyId } });
    res.json(company);
  })
);

// PUT /company — update profile (ADMIN only).
router.put(
  "/",
  requireRole("ADMIN"),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.update({
      where: { id: req.auth.companyId },
      data: req.body,
    });
    res.json(company);
  })
);

module.exports = router;
