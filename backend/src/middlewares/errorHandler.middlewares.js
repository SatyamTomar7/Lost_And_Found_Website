import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // 👉 If error is ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }

  let error = { ...err };
  error.message = err.message;

  // 👉 Invalid Mongo ObjectId
  if (err.name === "CastError") {
    error = {
      statusCode: 400,
      message: "Invalid resource ID format",
    };
  }

  // 👉 Duplicate key error (MongoDB)
  if (err.code === 11000) {
    let message = "Duplicate field value entered";
    const field = Object.keys(err.keyValue)[0];
    if (field === "email") {
      message = "Email already registered";
    }
    error = { statusCode: 400, message };
  }

  // 👉 Mongoose validation errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");

    error = { statusCode: 400, message };
  }

  // 👉 JWT expired
  if (err.name === "TokenExpiredError") {
    error = { statusCode: 401, message: "Token expired" };
  }

  // 👉 Invalid JWT token
  if (err.name === "JsonWebTokenError") {
    error = { statusCode: 401, message: "Invalid token" };
  }

  // 👉 Final fallback response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
      errors: err.errors || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export { errorHandler };
