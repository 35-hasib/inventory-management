const express = require("express");
const prisma = require("../../config/prisma");
const { z } = require("zod");
const validate = require("../../middleware/validate");
const requireRole = require("../../middleware/requireRole");
const planLimit = require("../../middleware/planLimit");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const { hashPassword } = require("../../utils/password");
const { publicUser } = require("../auth/auth.service");

const router = express.Router();

// All user-management routes are ADMIN only.
router.use(requireRole("ADMIN"));

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(100),
  role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
});

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(100).optional(),
});

// GET /users
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { companyId: req.auth.companyId },
      orderBy: { createdAt: "desc" },
    });
    res.json(users.map(publicUser));
  })
);

// POST /users
router.post(
  "/",
  planLimit("users"),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const exists = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (exists) throw ApiError.conflict("Email is already registered");

    const passwordHash = await hashPassword(req.body.password);
    const user = await prisma.user.create({
      data: {
        companyId: req.auth.companyId,
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        passwordHash,
      },
    });
    res.status(201).json(publicUser(user));
  })
);

// PUT /users/:id
router.put(
  "/:id",
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { companyId } = req.auth;
    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.role !== undefined) data.role = req.body.role;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    if (req.body.password) data.passwordHash = await hashPassword(req.body.password);

    const result = await prisma.user.updateMany({
      where: { id: req.params.id, companyId },
      data,
    });
    if (result.count === 0) throw ApiError.notFound("User not found");
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    res.json(publicUser(user));
  })
);

// DELETE /users/:id — prevent deleting yourself.
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.auth.userId) {
      throw ApiError.badRequest("You cannot delete your own account");
    }
    const result = await prisma.user.deleteMany({
      where: { id: req.params.id, companyId: req.auth.companyId },
    });
    if (result.count === 0) throw ApiError.notFound("User not found");
    res.json({ success: true });
  })
);

module.exports = router;
