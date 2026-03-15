import { body, validationResult, param, query } from "express-validator";
import { ApiError } from "../utils/ApiError.js";
import {
  COLORS,
  DEPARTMENTS,
  ITEM_CONDITIONS,
  ITEM_NAME,
  CAMPUS_LOCATIONS,
} from "../constants.js";

/**
 * Reusable middleware to handle validation results
 * Formats errors to be frontend-friendly
 */
const handleValidationErrors = (req, res, next) => {
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

// --- AUTH VALIDATIONS ---

const validateUserRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .matches(/^[\w.-]+@s\.amity\.edu$/)
    .withMessage("Email must be an Amity student email (@s.amity.edu)")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6, max: 100 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must include uppercase, lowercase, and a number"),

  handleValidationErrors,
];

const validateOTPVerification = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 6-digit number"),
  handleValidationErrors,
];

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

const validateAdminLogin = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
  body("department")
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(", ")}`),
  handleValidationErrors,
];

// --- PASSWORD RESET VALIDATIONS ---

const validateForgotPassword = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .matches(/^[\w.-]+@s\.amity\.edu$/)
    .withMessage("Email must be an Amity student email (@s.amity.edu)")
    .normalizeEmail(),
  handleValidationErrors,
];

const validateVerifyResetOTP = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 6-digit number"),
  handleValidationErrors,
];

const validateResetPassword = [
  body("resetToken").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 6, max: 100 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must include uppercase, lowercase, and a number"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  handleValidationErrors,
];

// --- ITEM VALIDATIONS ---

const validateLostItem = [
  body("name")
    .isIn(ITEM_NAME)
    .withMessage("Please select a valid item category"),

  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description should be between 10 and 500 characters"),

  body("color")
    .isIn(COLORS)
    .withMessage("Please select a color from the approved list"),

  body("condition")
    .isIn(Object.values(ITEM_CONDITIONS))
    .withMessage("Invalid condition selected"),

  body("brand").optional({ checkFalsy: true }).trim().isLength({ max: 50 }),

  body("dateLost")
    .isISO8601()
    .withMessage("Valid date is required")
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error("Date lost cannot be in the future");
      }
      return true;
    }),

  body("placeLost")
    .isIn(CAMPUS_LOCATIONS)
    .withMessage("Please select a valid campus location"),

  body("contactInfo.phone")
    .optional({ checkFalsy: true })
    .isMobilePhone("en-IN")
    .withMessage("Please provide a valid Indian phone number"),

  handleValidationErrors,
];

const validateFoundItem = [
  body("name")
    .isIn(ITEM_NAME)
    .withMessage("Please select a valid item category"),

  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("condition")
    .isIn(Object.values(ITEM_CONDITIONS))
    .withMessage("Invalid condition selected"),

  body("color")
    .isIn(COLORS)
    .withMessage("Please select a color from the approved list"),

  body("brand").optional({ checkFalsy: true }).trim().isLength({ max: 50 }),

  body("dateFound")
    .isISO8601()
    .withMessage("Valid date is required")
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error("Date found cannot be in the future");
      }
      return true;
    }),

  body("placeFound")
    .isIn(CAMPUS_LOCATIONS)
    .withMessage("Please select a valid campus location"),

  body("storageLocation")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Storage location notes are too long"),

  handleValidationErrors,
];

// --- UTILITY VALIDATIONS ---

const validateObjectId = [
  param("id").isMongoId().withMessage("Invalid ID format"),
  handleValidationErrors,
];

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
];

export {
  validateUserRegistration,
  validateOTPVerification,
  validateLogin,
  validateAdminLogin,
  validateForgotPassword, // ← new
  validateVerifyResetOTP, // ← new
  validateResetPassword, // ← new
  validateLostItem,
  validateFoundItem,
  validateObjectId,
  validatePagination,
};
