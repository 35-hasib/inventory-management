const express = require("express");
const prisma = require("../../config/prisma");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const { getPagination, paginatedResult } = require("../../utils/pagination");
const { renderPdf, invoiceDoc } = require("../../utils/pdf");

const router = express.Router();

// GET /invoices — list (both roles).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip, take } = getPagination(req.query);
    const where = { companyId: req.auth.companyId };
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        skip,
        take,
        include: { sale: { include: { customer: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json(paginatedResult(data, total, page, limit));
  })
);

// GET /invoices/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.auth.companyId },
      include: { sale: { include: { customer: true, items: { include: { product: true } } } } },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");
    res.json(invoice);
  })
);

// GET /invoices/:id/pdf — generate and stream the invoice PDF.
router.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.auth.companyId },
      include: { sale: { include: { customer: true, items: { include: { product: true } } } } },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");

    const company = await prisma.company.findUnique({ where: { id: req.auth.companyId } });
    const buffer = await renderPdf(invoiceDoc({ company, invoice, sale: invoice.sale }));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.number}.pdf"`);
    res.send(buffer);
  })
);

module.exports = router;
