const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

// Enforces subscription plan limits before creating a resource.
// resource: "products" | "users". A limit of 0 means unlimited.
module.exports = function planLimit(resource) {
  return async (req, res, next) => {
    try {
      const { companyId } = req.auth;
      const sub = await prisma.subscription.findUnique({
        where: { companyId },
        include: { plan: true },
      });

      // No subscription record → allow (fail open); expired/cancelled → block writes.
      if (!sub) return next();
      if (sub.status === "EXPIRED" || sub.status === "CANCELLED") {
        return next(ApiError.forbidden("Your subscription is inactive. Please renew to continue."));
      }

      const plan = sub.plan;
      if (!plan) return next();

      if (resource === "products" && plan.maxProducts > 0) {
        const count = await prisma.product.count({ where: { companyId } });
        if (count >= plan.maxProducts) {
          return next(
            ApiError.forbidden(
              `Your ${plan.name} plan allows up to ${plan.maxProducts} products. Upgrade to add more.`
            )
          );
        }
      }

      if (resource === "users" && plan.maxUsers > 0) {
        const count = await prisma.user.count({ where: { companyId } });
        if (count >= plan.maxUsers) {
          return next(
            ApiError.forbidden(
              `Your ${plan.name} plan allows up to ${plan.maxUsers} users. Upgrade to add more.`
            )
          );
        }
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
};
