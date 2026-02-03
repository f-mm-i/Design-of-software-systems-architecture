/**
 * Unified error format:
 * {
 *   "error": { "code": "...", "message": "...", "details": [...] }
 * }
 */

function httpError(status, code, message, details = []) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function notFoundHandler(req, _res, next) {
  next(httpError(404, "NOT_FOUND", `Маршрут не найден: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "Внутренняя ошибка сервера";
  const details = Array.isArray(err.details) ? err.details : [];

  res.status(status).json({ error: { code, message, details } });
}

module.exports = { httpError, notFoundHandler, errorHandler };
