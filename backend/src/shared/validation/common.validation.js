import { param, query } from "express-validator";
import { handleValidationErrors } from "./validate-request.js";

const validateObjectId = [
  param("id").isMongoId().withMessage("Invalid ID format"),
  handleValidationErrors,
];

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
];

const validatePaginationAllowAll = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit")
    .optional()
    .custom((value) => {
      if (typeof value === "string" && value.trim().toLowerCase() === "all") {
        return true;
      }

      const parsed = Number.parseInt(value, 10);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
        return true;
      }

      throw new Error("Limit must be an integer between 1 and 100 or 'all'");
    }),
  handleValidationErrors,
];

export { validateObjectId, validatePagination, validatePaginationAllowAll };
