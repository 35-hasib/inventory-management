// Seeds the three SubscriptionPlan reference rows (config, not demo accounts).
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PLANS = [
  {
    tier: "FREE",
    name: "Free",
    priceMonthly: 0,
    maxUsers: 2,
    maxProducts: 50,
    features: { reports: false, export: false, support: "community" },
  },
  {
    tier: "BASIC",
    name: "Basic",
    priceMonthly: 19,
    maxUsers: 10,
    maxProducts: 1000,
    features: { reports: true, export: true, support: "email" },
  },
  {
    tier: "PREMIUM",
    name: "Premium",
    priceMonthly: 49,
    maxUsers: 0, // 0 = unlimited
    maxProducts: 0,
    features: { reports: true, export: true, support: "priority" },
  },
];

async function main() {
  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        maxUsers: plan.maxUsers,
        maxProducts: plan.maxProducts,
        features: plan.features,
      },
      create: plan,
    });
  }
  // eslint-disable-next-line no-console
  console.log("Seeded subscription plans:", PLANS.map((p) => p.tier).join(", "));
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
