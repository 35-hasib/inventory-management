const ApiError = require("../utils/ApiError");

// Gate a route to one or more roles, e.g. requireRole("ADMIN").
module.exports = function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(ApiError.forbidden("Insufficient permissions"));
    }
    return next();
  };
};
