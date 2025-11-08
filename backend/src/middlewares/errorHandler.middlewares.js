const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  console.error("Error:", err);

  // Invalid Mongo ObjectId
  if (err.name === "CastError") {
    const message = "Invalid resource ID format";
    error = { message, statusCode: 400 };
  }

  // Duplicate key (e.g., email already exists)
  if (err.code === 11000) {
    let message = "Duplicate field value entered";
    const field = Object.keys(err.keyValue)[0];
    if (field === "email") {
      message = "Email already registered";
    }
    error = { message, statusCode: 400 };
  }

  // Validation errors (Mongoose schema)
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = { message, statusCode: 400 };
  }

  // JWT expired
  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = { message, statusCode: 401 };
  }

  // Invalid JWT token
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = { message, statusCode: 401 };
  }

  // Send final response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export { errorHandler };

