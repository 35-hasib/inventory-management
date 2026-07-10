const express = require("express");
const prisma = require("../../config/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const { getPagination, paginatedResult } = require("../../utils/pagination");

const router = express.Router();

// GET /notifications — list (optionally only unread).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = getPagination(req.query);
    const where = {
      companyId: req.auth.companyId,
      ...(req.query.unread === "true" ? { isRead: false } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.notification.count({ where }),
    ]);
    res.json(paginatedResult(data, total, page, limit));
  })
);

// GET /notifications/unread-count
router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({
      where: { companyId: req.auth.companyId, isRead: false },
    });
    res.json({ count });
  })
);

// PUT /notifications/:id/read
router.put(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
      data: { isRead: true },
    });
    if (result.count === 0) throw ApiError.notFound("Notification not found");
    res.json({ success: true });
  })
);

// PUT /notifications/read-all
router.put(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { companyId: req.auth.companyId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  })
);

module.exports = router;
