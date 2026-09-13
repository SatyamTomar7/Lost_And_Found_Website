import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

const isDevelopment = () => process.env.NODE_ENV === "development";

const getRequestLogFields = (req, statusCode, err) => ({
  requestId: req.requestId,
  method: req.method,
  path: req.originalUrl || req.path,
  statusCode,
  error: {
    name: err?.name || "Error",
    message: err?.message || "Unknown error",
    ...(err?.stack && { stack: err.stack }),
  },
  ...(req.user?._id && { userId: req.user._id.toString() }),
  ...(req.ip && { ip: req.ip }),
  ...(req.get("user-agent") && { userAgent: req.get("user-agent") }),
});

const getKnownErrorResponse = (err) => {
  let statusCode = 500;
  let message = "Internal server error";
  let fieldErrors = Array.isArray(err?.errors) ? err.errors : [];

  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      fieldErrors,
      known: true,
    };
  }

  if (err?.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID format";
  } else if (err?.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;

    if (field === "email") message = "Email already registered";
    if (field === "enrollmentNumber")
      message = "Enrollment number already exists";
    if (field === "phoneNumber") message = "Phone number already exists";
    if (field) fieldErrors = [{ field, message }];
  } else if (err?.name === "ValidationError") {
    statusCode = 400;
    fieldErrors = Object.entries(err.errors || {}).map(([field, value]) => ({
      field,
      message: value.message,
    }));
    message = fieldErrors.map((value) => value.message).join(", ");
  } else if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please log in again.";
  } else if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  } else {
    return { statusCode, message, fieldErrors, known: false };
  }

  return { statusCode, message, fieldErrors, known: true };
};

const createErrorHandler = (log = logger) => (err, req, res, _next) => {
  const response = getKnownErrorResponse(err);
  const isUnexpected = !response.known || response.statusCode >= 500;

  if (isUnexpected) {
    log.error(
      getRequestLogFields(req, response.statusCode, err),
      "Unhandled server error"
    );
  }

  const body = {
    success: false,
    message:
      isUnexpected && !isDevelopment()
        ? "Internal server error"
        : response.message,
    errors: response.fieldErrors,
    requestId: req.requestId,
    ...(isDevelopment() && err?.stack && { stack: err.stack }),
  };

  return res.status(response.statusCode).json(body);
};

const errorHandler = createErrorHandler();

export { createErrorHandler, errorHandler, getKnownErrorResponse };
