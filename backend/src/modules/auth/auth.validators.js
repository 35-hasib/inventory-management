const { z } = require("zod");

const registerSchema = z.object({
  companyName: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6).max(100),
  phone: z.string().max(40).optional(),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

module.exports = { registerSchema, loginSchema, changePasswordSchema };
