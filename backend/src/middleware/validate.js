const ApiError = require("../utils/ApiError");

// Validates req[source] against a zod schema, replacing it with the parsed value.
// Usage: router.post("/", validate(schema), handler)  // defaults to body
module.exports = function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return next(ApiError.badRequest("Validation failed", details));
    }
    req[source] = result.data;
    return next();
  };
};
