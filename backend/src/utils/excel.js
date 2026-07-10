const ExcelJS = require("exceljs");

// Build an .xlsx buffer from columns + rows.
// columns: [{ header, key, width }]   rows: [{ key: value }]
async function buildWorkbook(sheetName, columns, rows) {
  const wb = new ExcelJS.Workbook();
  // Excel worksheet names can't contain * ? : \ / [ ] and are capped at 31 chars.
  const safeName = String(sheetName).replace(/[*?:\\/[\]]/g, "-").slice(0, 31) || "Sheet1";
  const ws = wb.addWorksheet(safeName);
  ws.columns = columns;
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  return wb.xlsx.writeBuffer();
}

module.exports = { buildWorkbook };
