const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");

// Create a purchase: increments product stock atomically and records StockMovements.
async function createPurchase(companyId, userId, payload) {
  const { supplierId, reference, notes, items } = payload;

  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId } });
    if (!supplier) throw ApiError.badRequest("Invalid supplier");
  }

  // Validate all products belong to the tenant before mutating anything.
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, companyId } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    if (!productMap.has(item.productId)) throw ApiError.badRequest(`Invalid product: ${item.productId}`);
  }

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        companyId,
        supplierId: supplierId || null,
        userId,
        reference: reference || null,
        notes: notes || null,
        status: "RECEIVED",
        totalAmount,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            lineTotal: i.quantity * i.unitCost,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    for (const item of items) {
      const updated = await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          companyId,
          productId: item.productId,
          type: "PURCHASE",
          quantityChange: item.quantity,
          balanceAfter: updated.quantity,
          referenceType: "PURCHASE",
          referenceId: purchase.id,
          userId,
        },
      });
    }

    return purchase;
  });
}

async function listPurchases(companyId, { skip, take }) {
  const where = { companyId };
  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { supplier: true, _count: { select: { items: true } } },
    }),
    prisma.purchase.count({ where }),
  ]);
  return { data, total };
}

async function getPurchase(companyId, id) {
  const purchase = await prisma.purchase.findFirst({
    where: { id, companyId },
    include: { supplier: true, user: true, items: { include: { product: true } } },
  });
  if (!purchase) throw ApiError.notFound("Purchase not found");
  return purchase;
}

// Cancel a received purchase: reverses stock via RETURN_OUT movements.
async function cancelPurchase(companyId, userId, id) {
  const purchase = await prisma.purchase.findFirst({
    where: { id, companyId },
    include: { items: true },
  });
  if (!purchase) throw ApiError.notFound("Purchase not found");
  if (purchase.status === "CANCELLED") throw ApiError.badRequest("Purchase already cancelled");

  return prisma.$transaction(async (tx) => {
    for (const item of purchase.items) {
      // Guarded decrement so stock never goes negative if items were already sold.
      const result = await tx.product.updateMany({
        where: { id: item.productId, companyId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        throw ApiError.badRequest("Cannot cancel: stock already consumed by sales");
      }
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      await tx.stockMovement.create({
        data: {
          companyId,
          productId: item.productId,
          type: "RETURN_OUT",
          quantityChange: -item.quantity,
          balanceAfter: product.quantity,
          referenceType: "PURCHASE_CANCEL",
          referenceId: purchase.id,
          userId,
        },
      });
    }
    return tx.purchase.update({ where: { id }, data: { status: "CANCELLED" } });
  });
}

module.exports = { createPurchase, listPurchases, getPurchase, cancelPurchase };
