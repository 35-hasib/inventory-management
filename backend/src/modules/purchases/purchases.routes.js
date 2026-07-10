const express = require("express");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const { getPagination, paginatedResult } = require("../../utils/pagination");
const service = require("./purchases.service");

const router = express.Router();

const createSchema = z.object({
  supplierId: z.string().nullable().optional(),
  reference: z.string().max(80).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitCost: z.coerce.number().min(0),
      })
    )
    .min(1, "At least one item is required"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = getPagination(req.query);
    const { data, total } = await service.listPurchases(req.auth.companyId, { skip, take });
    res.json(paginatedResult(data, total, page, limit));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await service.getPurchase(req.auth.companyId, req.params.id));
  })
);

// Both roles can record purchases.
router.post(
  "/",
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const purchase = await service.createPurchase(req.auth.companyId, req.auth.userId, req.body);
    res.status(201).json(purchase);
  })
);

// Cancelling is ADMIN only.
router.post(
  "/:id/cancel",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const purchase = await service.cancelPurchase(req.auth.companyId, req.auth.userId, req.params.id);
    res.json(purchase);
  })
);

module.exports = router;
