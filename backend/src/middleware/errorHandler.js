const { Prisma } = require("@prisma/client");
const ApiError = require("../utils/ApiError");
const env = require("../config/env");

// Central error handler. Translates ApiError, Prisma errors, and unknown errors
// into a consistent JSON shape: { error: { message, details? } }.
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json({ error: { message: err.message, details: err.details } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const fields = (err.meta && err.meta.target) || [];
      return res.status(409).json({
        error: { message: `Duplicate value for: ${Array.isArray(fields) ? fields.join(", ") : fields}` },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { message: "Record not found" } });
    }
    if (err.code === "P2003") {
      return res.status(400).json({ error: { message: "Related record constraint failed" } });
    }
  }

  // eslint-disable-next-line no-console
  console.error("[error]", err);
  return res.status(500).json({
    error: {
      message: "Internal server error",
      ...(env.NODE_ENV !== "production" ? { detail: err.message } : {}),
    },
  });
};
