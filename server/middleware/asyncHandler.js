// Wraps async route handlers so unhandled promise rejections
// flow to Express's centralized error handler instead of crashing.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
