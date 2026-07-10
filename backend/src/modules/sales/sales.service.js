const prisma = require("../../config/prisma");
const ApiError = require("../../utils/ApiError");
const { checkAndNotifyStock } = require("../../utils/notify");

// Create a sale: race-safe stock decrement, snapshots cost/price, generates an invoice.
async function createSale(companyId, userId, payload) {
  const { customerId, discount = 0, tax = 0, notes, items } = payload;

  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
    if (!customer) throw ApiError.badRequest("Invalid customer");
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, companyId } });
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of items) {
    if (!productMap.has(item.productId)) throw ApiError.badRequest(`Invalid product: ${item.productId}`);
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const totalAmount = Math.max(0, subtotal - discount + tax);

  const sale = await prisma.$transaction(async (tx) => {
    // 1. Guarded atomic decrement per item — prevents oversell under concurrency.
    for (const item of items) {
      const result = await tx.product.updateMany({
        where: { id: item.productId, companyId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        const p = productMap.get(item.productId);
        throw ApiError.badRequest(`Insufficient stock for ${p.name} (have ${p.quantity}, need ${item.quantity})`);
      }
    }

    // 2. Create the sale with snapshotted unit price + cost.
    const created = await tx.sale.create({
      data: {
        companyId,
        customerId: customerId || null,
        userId,
        status: "COMPLETED",
        subtotal,
        discount,
        tax,
        totalAmount,
        notes: notes || null,
        items: {
          create: items.map((i) => {
            const p = productMap.get(i.productId);
            return {
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              unitCostAtSale: p.costPrice,
              lineTotal: i.quantity * i.unitPrice,
            };
          }),
        },
      },
      include: { items: true },
    });

    // 3. Stock movements (read post-decrement balance within the tx).
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      await tx.stockMovement.create({
        data: {
          companyId,
          productId: item.productId,
          type: "SALE",
          quantityChange: -item.quantity,
          balanceAfter: product.quantity,
          referenceType: "SALE",
          referenceId: created.id,
          userId,
        },
      });
    }

    // 4. Invoice with a race-free per-company sequential number.
    const counter = await tx.invoiceCounter.update({
      where: { companyId },
      data: { lastNumber: { increment: 1 } },
    });
    const number = `${company.invoicePrefix}-${String(counter.lastNumber).padStart(6, "0")}`;
    await tx.invoice.create({
      data: { companyId, saleId: created.id, number, totalAmount },
    });

    return created;
  });

  // 5. Low-stock notifications (outside the critical transaction).
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (product && product.quantity <= product.lowStockThreshold) {
      await checkAndNotifyStock(companyId, product);
    }
  }

  return getSale(companyId, sale.id);
}

async function listSales(companyId, { skip, take }) {
  const where = { companyId };
  const [data, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { customer: true, invoice: true, _count: { select: { items: true } } },
    }),
    prisma.sale.count({ where }),
  ]);
  return { data, total };
}

async function getSale(companyId, id) {
  const sale = await prisma.sale.findFirst({
    where: { id, companyId },
    include: { customer: true, user: true, invoice: true, items: { include: { product: true } } },
  });
  if (!sale) throw ApiError.notFound("Sale not found");
  return sale;
}

// Refund a sale: restock items via RETURN_IN movements.
async function refundSale(companyId, userId, id) {
  const sale = await prisma.sale.findFirst({ where: { id, companyId }, include: { items: true } });
  if (!sale) throw ApiError.notFound("Sale not found");
  if (sale.status !== "COMPLETED") throw ApiError.badRequest("Only completed sales can be refunded");

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          companyId,
          productId: item.productId,
          type: "RETURN_IN",
          quantityChange: item.quantity,
          balanceAfter: product.quantity,
          referenceType: "SALE_REFUND",
          referenceId: sale.id,
          userId,
        },
      });
    }
    await tx.sale.update({ where: { id }, data: { status: "REFUNDED" } });
  });

  return getSale(companyId, id);
}

module.exports = { createSale, listSales, getSale, refundSale };
