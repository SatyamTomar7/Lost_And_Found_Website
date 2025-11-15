// const errorHandler = (err, req, res, next) => {
//   let error = { ...err };
//   error.message = err.message;
//   console.error("Error:", err);

//   // Invalid Mongo ObjectId
//   if (err.name === "CastError") {
//     const message = "Invalid resource ID format";
//     error = { message, statusCode: 400 };
//   }

//   // Duplicate key (e.g., email already exists)
//   if (err.code === 11000) {
//     let message = "Duplicate field value entered";
//     const field = Object.keys(err.keyValue)[0];
//     if (field === "email") {
//       message = "Email already registered";
//     }
//     error = { message, statusCode: 400 };
//   }

//   // Validation errors (Mongoose schema)
//   if (err.name === "ValidationError") {
//     const message = Object.values(err.errors)
//       .map((val) => val.message)
//       .join(", ");
//     error = { message, statusCode: 400 };
//   }

//   // JWT expired
//   if (err.name === "TokenExpiredError") {
//     const message = "Token expired";
//     error = { message, statusCode: 401 };
//   }

//   // Invalid JWT token
//   if (err.name === "JsonWebTokenError") {
//     const message = "Invalid token";
//     error = { message, statusCode: 401 };
//   }

//   // Send final response
//   res.status(error.statusCode || 500).json({
//     success: false,
//     message: error.message || "Server Error",
//     ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
//   });
// };

// export { errorHandler };

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
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export { errorHandler };
