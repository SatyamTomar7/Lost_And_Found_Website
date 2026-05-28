import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let fieldErrors = Array.isArray(err.errors) ? err.errors : [];

  if (!err.statusCode || err.statusCode >= 500) {
    console.error("Server Error:", err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  let statusCode = 500;
  let message = err.message || "Server Error";

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID format";
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate field value entered";
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;
    if (field === "email") {
      message = "Email already registered";
    }
    if (field === "enrollmentNumber") {
      message = "Enrollment number already exists";
    }
    if (field === "phoneNumber") {
      message = "Phone number already exists";
    }
    if (field) {
      fieldErrors = [{ field, message, value: err.keyValue?.[field] }];
    }
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    fieldErrors = Object.entries(err.errors).map(([field, value]) => ({
      field,
      message: value.message,
      value: value.value,
    }));
    message = fieldErrors.map((val) => val.message).join(", ");
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please log in again.";
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: fieldErrors,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export { errorHandler };
