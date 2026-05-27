import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    throw new ApiError(400, "Validation failed", formattedErrors);
  }

  next();
};
