const express = require("express");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { getPagination, paginatedResult } = require("../../utils/pagination");
const service = require("./sales.service");

const router = express.Router();

const createSchema = z.object({
  customerId: z.string().nullable().optional(),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().min(0),
      })
    )
    .min(1, "At least one item is required"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = getPagination(req.query);
    const { data, total } = await service.listSales(req.auth.companyId, { skip, take });
    res.json(paginatedResult(data, total, page, limit));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await service.getSale(req.auth.companyId, req.params.id));
  })
);

// Both roles can create sales.
router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const sale = await service.createSale(req.auth.companyId, req.auth.userId, req.body);
    res.status(201).json(sale);
  })
);

// Refund is ADMIN only.
router.post(
  "/:id/refund",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const sale = await service.refundSale(req.auth.companyId, req.auth.userId, req.params.id);
    res.json(sale);
  })
);

module.exports = router;
