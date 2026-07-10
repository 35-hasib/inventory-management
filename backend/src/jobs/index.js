const cron = require("node-cron");
const prisma = require("../config/prisma");
const { checkAndNotifyStock } = require("../utils/notify");

// Nightly safety-net sweep for low/out-of-stock products and expired subscriptions.
function startCronJobs() {
  // 02:15 every day — low-stock sweep.
  cron.schedule("15 2 * * *", async () => {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
      });
      for (const p of products) {
        if (p.quantity <= p.lowStockThreshold) {
          await checkAndNotifyStock(p.companyId, p);
        }
      }
      // eslint-disable-next-line no-console
      console.log("[cron] low-stock sweep complete");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[cron] low-stock sweep failed", err);
    }
  });

  // 03:00 every day — expire subscriptions past their period end.
  cron.schedule("0 3 * * *", async () => {
    try {
      const now = new Date();
      const expired = await prisma.subscription.updateMany({
        where: {
          currentPeriodEnd: { lt: now },
          status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
        },
        data: { status: "EXPIRED" },
      });
      // eslint-disable-next-line no-console
      console.log(`[cron] expired ${expired.count} subscriptions`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[cron] subscription sweep failed", err);
    }
  });
}

module.exports = { startCronJobs };
