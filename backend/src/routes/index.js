const express = require("express");
const authenticate = require("../middleware/authenticate");

const authRoutes = require("../modules/auth/auth.routes");
const companyRoutes = require("../modules/companies/companies.routes");
const userRoutes = require("../modules/users/users.routes");
const categoryRoutes = require("../modules/categories/categories.routes");
const productRoutes = require("../modules/products/products.routes");
const supplierRoutes = require("../modules/suppliers/suppliers.routes");
const customerRoutes = require("../modules/customers/customers.routes");
const purchaseRoutes = require("../modules/purchases/purchases.routes");
const saleRoutes = require("../modules/sales/sales.routes");
const inventoryRoutes = require("../modules/inventory/inventory.routes");
const invoiceRoutes = require("../modules/invoices/invoices.routes");
const reportRoutes = require("../modules/reports/reports.routes");
const notificationRoutes = require("../modules/notifications/notifications.routes");
const subscriptionRoutes = require("../modules/subscriptions/subscriptions.routes");
const dashboardRoutes = require("../modules/dashboard/dashboard.routes");

const router = express.Router();

// Public
router.use("/auth", authRoutes);
router.use("/subscriptions/plans", subscriptionRoutes.publicRouter); // GET plans (public)

// Everything below requires authentication.
router.use(authenticate);

router.use("/company", companyRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/customers", customerRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/sales", saleRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/reports", reportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/subscriptions", subscriptionRoutes.router);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
