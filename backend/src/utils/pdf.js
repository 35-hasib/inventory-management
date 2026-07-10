const PdfPrinter = require("pdfmake");

// Use the built-in standard PDF fonts (Helvetica) so no .ttf files are required.
const printer = new PdfPrinter({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
});

// Render a pdfmake document definition to a Buffer.
function renderPdf(docDefinition) {
  return new Promise((resolve, reject) => {
    const def = { defaultStyle: { font: "Helvetica" }, ...docDefinition };
    const doc = printer.createPdfKitDocument(def);
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function money(n, currency = "USD") {
  const num = Number(n || 0);
  return `${currency} ${num.toFixed(2)}`;
}

// Build an invoice PDF document definition.
function invoiceDoc({ company, invoice, sale }) {
  const currency = company.currency || "USD";
  const rows = sale.items.map((it) => [
    it.product ? it.product.name : "Item",
    String(it.quantity),
    money(it.unitPrice, currency),
    money(it.lineTotal, currency),
  ]);

  return {
    content: [
      { text: company.name, style: "h1" },
      { text: [company.address, company.phone, company.email].filter(Boolean).join("  •  "), style: "muted" },
      { text: "INVOICE", style: "h2", margin: [0, 20, 0, 4] },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: `Invoice #: ${invoice.number}`, bold: true },
              { text: `Date: ${new Date(invoice.issuedAt).toLocaleDateString()}` },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "Bill To:", bold: true },
              { text: sale.customer ? sale.customer.name : "Walk-in customer" },
              { text: sale.customer && sale.customer.email ? sale.customer.email : "" },
            ],
          },
        ],
        margin: [0, 0, 0, 16],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto"],
          body: [
            [
              { text: "Item", style: "th" },
              { text: "Qty", style: "th" },
              { text: "Unit Price", style: "th" },
              { text: "Total", style: "th" },
            ],
            ...rows,
          ],
        },
        layout: "lightHorizontalLines",
      },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            table: {
              body: [
                ["Subtotal", money(sale.subtotal, currency)],
                ["Discount", money(sale.discount, currency)],
                ["Tax", money(sale.tax, currency)],
                [{ text: "Total", bold: true }, { text: money(sale.totalAmount, currency), bold: true }],
              ],
            },
            layout: "noBorders",
          },
        ],
        margin: [0, 16, 0, 0],
      },
      { text: "Thank you for your business!", style: "muted", margin: [0, 30, 0, 0] },
    ],
    styles: {
      h1: { fontSize: 18, bold: true },
      h2: { fontSize: 16, bold: true },
      th: { bold: true, fillColor: "#f3f4f6" },
      muted: { color: "#6b7280", fontSize: 9 },
    },
  };
}

module.exports = { renderPdf, invoiceDoc, money };
