import logger from "../utils/logger.js";

const getRoutePath = (req) => req.route?.path || req.path;

export const createRequestLoggerMiddleware = (log = logger) => (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const statusCode = res.statusCode;
    const responseTimeMs =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    if (req.path === "/api/health" && statusCode < 400) {
      return;
    }

    const fields = {
      requestId: req.requestId,
      method: req.method,
      path: getRoutePath(req),
      statusCode,
      responseTimeMs: Number(responseTimeMs.toFixed(2)),
      ...(req.user?._id && { userId: req.user._id.toString() }),
    };

    if (statusCode >= 500) {
      log.error(fields, "HTTP request failed");
    } else if (statusCode >= 400) {
      log.warn(fields, "HTTP request returned a client error");
    } else {
      log.info(fields, "HTTP request completed");
    }
  });

  next();
};

export const requestLoggerMiddleware = createRequestLoggerMiddleware();
