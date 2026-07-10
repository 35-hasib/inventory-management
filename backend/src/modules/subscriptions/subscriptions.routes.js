const express = require("express");
const prisma = require("../../config/prisma");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");

// Public router: list available plans (mounted before auth).
const publicRouter = express.Router();
publicRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: "asc" },
    });
    res.json(plans);
  })
);

// Authenticated router: current subscription, upgrade, payments.
const router = express.Router();

// GET /subscriptions — current subscription + plan.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const sub = await prisma.subscription.findUnique({
      where: { companyId: req.auth.companyId },
      include: { plan: true },
    });
    res.json(sub);
  })
);

const changeSchema = z.object({ tier: z.enum(["FREE", "BASIC", "PREMIUM"]) });

// POST /subscriptions/change — switch plan (ADMIN). Records a payment for paid plans.
router.post(
  "/change",
  requireRole("ADMIN"),
  validate(changeSchema),
  asyncHandler(async (req, res) => {
    const { companyId } = req.auth;
    const plan = await prisma.subscriptionPlan.findUnique({ where: { tier: req.body.tier } });
    if (!plan) throw ApiError.badRequest("Unknown plan");

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.upsert({
        where: { companyId },
        update: {
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        create: {
          companyId,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      if (Number(plan.priceMonthly) > 0) {
        await tx.payment.create({
          data: {
            companyId,
            subscriptionId: updated.id,
            amount: plan.priceMonthly,
            status: "SUCCEEDED",
            provider: "manual",
            paidAt: new Date(),
          },
        });
        await tx.notification.create({
          data: {
            companyId,
            type: "PAYMENT",
            title: "Payment recorded",
            message: `Subscribed to ${plan.name} plan ($${Number(plan.priceMonthly).toFixed(2)}/mo).`,
          },
        });
      }
      return updated;
    });

    res.json(sub);
  })
);

// POST /subscriptions/cancel — cancel at period end (ADMIN).
router.post(
  "/cancel",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const sub = await prisma.subscription.update({
      where: { companyId: req.auth.companyId },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });
    res.json(sub);
  })
);

// GET /subscriptions/payments — billing history (ADMIN).
router.get(
  "/payments",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const payments = await prisma.payment.findMany({
      where: { companyId: req.auth.companyId },
      orderBy: { createdAt: "desc" },
    });
    res.json(payments);
  })
);

module.exports = { router, publicRouter };
