const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

// Verifies the Bearer JWT and attaches req.auth = { userId, companyId, role }.
// companyId here is the ONLY trusted tenant identifier — never read it from the body.
module.exports = function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized("Missing authentication token"));

  try {
    const payload = verifyToken(token);
    req.auth = {
      userId: payload.sub,
      companyId: payload.companyId,
      role: payload.role,
    };
    return next();
  } catch (err) {
    return next(ApiError.unauthorized("Invalid or expired token"));
  }
};
