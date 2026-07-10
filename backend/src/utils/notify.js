const prisma = require("../config/prisma");

// Creates a low-stock / out-of-stock notification for a product, deduped against
// any existing unread notification of the same type for that product.
async function checkAndNotifyStock(companyId, product) {
  let type = null;
  let title = null;
  let message = null;

  if (product.quantity <= 0) {
    type = "OUT_OF_STOCK";
    title = "Out of stock";
    message = `${product.name} (SKU ${product.sku}) is out of stock.`;
  } else if (product.quantity <= product.lowStockThreshold) {
    type = "LOW_STOCK";
    title = "Low stock";
    message = `${product.name} (SKU ${product.sku}) is low: ${product.quantity} left.`;
  }

  if (!type) return null;

  const existing = await prisma.notification.findFirst({
    where: { companyId, type, referenceId: product.id, isRead: false },
  });
  if (existing) return existing;

  return prisma.notification.create({
    data: {
      companyId,
      type,
      title,
      message,
      referenceType: "PRODUCT",
      referenceId: product.id,
    },
  });
}

module.exports = { checkAndNotifyStock };
