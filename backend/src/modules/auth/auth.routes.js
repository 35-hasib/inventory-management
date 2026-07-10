const express = require("express");
const controller = require("./auth.controller");
const validate = require("../../middleware/validate");
const authenticate = require("../../middleware/authenticate");
const asyncHandler = require("../../utils/asyncHandler");
const { registerSchema, loginSchema, changePasswordSchema } = require("./auth.validators");

const router = express.Router();

router.post("/register", validate(registerSchema), asyncHandler(controller.register));
router.post("/login", validate(loginSchema), asyncHandler(controller.login));
router.get("/me", authenticate, asyncHandler(controller.me));
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(controller.changePassword)
);

module.exports = router;
