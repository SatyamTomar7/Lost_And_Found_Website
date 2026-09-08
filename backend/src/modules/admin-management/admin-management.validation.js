import { body } from "express-validator";
import { handleValidationErrors } from "../../shared/validation/validate-request.js";

export const validateAssignmentUpdate = [
  body("version")
    .isInt({ min: 0 })
    .toInt()
    .withMessage("A valid assignment version is required"),
  body("assignments")
    .isArray({ min: 0, max: 5 })
    .withMessage("Assignments must contain at most five admins"),
  body("assignments.*.adminId")
    .isMongoId()
    .withMessage("Each assignment needs a valid admin ID"),
  body("assignments.*.block")
    .isIn(["A", "B", "C", "D", "E"])
    .withMessage("Block must be A, B, C, D, or E"),
  handleValidationErrors,
];
