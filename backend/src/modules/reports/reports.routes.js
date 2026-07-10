const express = require("express");
const requireRole = require("../../middleware/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const service = require("./reports.service");
const { buildWorkbook } = require("../../utils/excel");
const { renderPdf } = require("../../utils/pdf");

const router = express.Router();

// Reports expose financials → ADMIN only.
router.use(requireRole("ADMIN"));

const REPORTS = {
  sales: service.salesReport,
  purchases: service.purchasesReport,
  inventory: (companyId) => service.inventoryReport(companyId),
  "profit-loss": service.profitLossReport,
};

// GET /reports/:type — JSON report (type in sales|purchases|inventory|profit-loss).
router.get(
  "/:type",
  asyncHandler(async (req, res) => {
    const fn = REPORTS[req.params.type];
    if (!fn) throw ApiError.notFound("Unknown report type");
    const data = await fn(req.auth.companyId, req.query);
    res.json(data);
  })
);

// Flatten a report into excel/pdf-friendly columns + rows.
function tabular(type, report) {
  if (type === "inventory") {
    return {
      columns: [
        { header: "Name", key: "name", width: 30 },
        { header: "SKU", key: "sku", width: 16 },
        { header: "Category", key: "category", width: 18 },
        { header: "Qty", key: "quantity", width: 8 },
        { header: "Cost", key: "cost_price", width: 12 },
        { header: "Sell", key: "sell_price", width: 12 },
        { header: "Stock Value", key: "stock_value", width: 14 },
      ],
      rows: report.rows,
      title: "Inventory Report",
    };
  }
  if (type === "profit-loss") {
    return {
      columns: [
        { header: "Period", key: "period", width: 16 },
        { header: "Revenue", key: "revenue", width: 14 },
        { header: "COGS", key: "cogs", width: 14 },
        { header: "Profit", key: "profit", width: 14 },
      ],
      rows: report.rows,
      title: "Profit / Loss Report",
    };
  }
  if (type === "purchases") {
    return {
      columns: [
        { header: "Period", key: "period", width: 16 },
        { header: "Orders", key: "orders", width: 10 },
        { header: "Cost", key: "cost", width: 14 },
      ],
      rows: report.rows,
      title: "Purchases Report",
    };
  }
  // sales
  return {
    columns: [
      { header: "Period", key: "period", width: 16 },
      { header: "Orders", key: "orders", width: 10 },
      { header: "Revenue", key: "revenue", width: 14 },
    ],
    rows: report.rows,
    title: "Sales Report",
  };
}

// GET /reports/:type/export?format=excel|pdf
router.get(
  "/:type/export",
  asyncHandler(async (req, res) => {
    const fn = REPORTS[req.params.type];
    if (!fn) throw ApiError.notFound("Unknown report type");
    const report = await fn(req.auth.companyId, req.query);
    const { columns, rows, title } = tabular(req.params.type, report);
    const format = req.query.format === "pdf" ? "pdf" : "excel";

    if (format === "excel") {
      const buffer = await buildWorkbook(title, columns, rows);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-report.xlsx"`);
      return res.send(Buffer.from(buffer));
    }

    const body = [
      columns.map((c) => ({ text: c.header, bold: true, fillColor: "#f3f4f6" })),
      ...rows.map((r) => columns.map((c) => {
        const v = r[c.key];
        return typeof v === "number" ? v.toFixed(2) : String(v ?? "");
      })),
    ];
    const buffer = await renderPdf({
      content: [
        { text: title, fontSize: 16, bold: true, margin: [0, 0, 0, 12] },
        { table: { headerRows: 1, widths: columns.map(() => "*"), body }, layout: "lightHorizontalLines" },
      ],
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-report.pdf"`);
    return res.send(buffer);
  })
);

module.exports = router;
