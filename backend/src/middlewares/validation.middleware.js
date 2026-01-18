import { body, validationResult,param,query } from "express-validator";
import { ApiError } from "../utils/ApiError.js"; // note .js for ESM
import { COLORS, DEPARTMENTS, ITEM_CATEGORIES } from "../constants.js";

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
      value: err.value,
    }));

    throw new ApiError(400, "Validation errors", formattedErrors);
  }

  next();
};

// Define all validation rules
const validateUserRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    // .matches(/^[\w.-]+@s\.amity\.edu$/)
    // .withMessage("Email must be an Amity University email (@s.amity.edu)")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6, max: 100 })
    .withMessage("Password must be between 6 and 100 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),

  handleValidationErrors,
];

const validateOTPVerification = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits long")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),

  handleValidationErrors,
];

const validateAdminLogin = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("username must be between 3 and 50 characters"),

  body("password").notEmpty().withMessage("Password is required"),

  body("department")
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of : ${DEPARTMENTS.join(", ")}`),

  handleValidationErrors,
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid amity email"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

const validateLostItem = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Item name must be between 2 and 100 characters"),

  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Description must be between 10 and 500 characters"),

  body("category")
    .isIn(ITEM_CATEGORIES)
    .withMessage(`Category must be one of ${ITEM_CATEGORIES.join(", ")}`),

  body("color")
    .isIn(COLORS)
    .withMessage(`Color must be one of: ${COLORS.join(", ")}`),

  body("brand")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Brand cannot exceed 50 characters"),

  body("dateLost")
    .isISO8601()
    .withMessage("Please provide a valid date")
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error("Date lost cannot be in the future");
      }
      return true;
    }),

  body("placeLost")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Place lost must be between 2 and 100 characters"),

  body("contactInfo.phone")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Please provide a valid Indian phone number"),

  handleValidationErrors,
];
const validateObjectId = [
  param("id").isMongoId().withMessage("Invalid ID format"),

  handleValidationErrors,
];
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  handleValidationErrors,
];

export {
  validateUserRegistration,
  validateOTPVerification,
  validateLogin,
  validateAdminLogin,
  validateLostItem,
  validateObjectId,
  validatePagination
};
