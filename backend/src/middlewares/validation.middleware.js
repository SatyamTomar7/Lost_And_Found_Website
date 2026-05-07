import { body, validationResult, param, query } from "express-validator";
import { ApiError } from "../utils/ApiError.js";
import {
  COLORS,
  DEPARTMENTS,
  ITEM_CONDITIONS,
  ITEM_NAME,
  CAMPUS_LOCATIONS,
} from "../constants.js";

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
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be a 6-digit number"),
  handleValidationErrors,
];

const validateLogin = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

const validateAdminLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Enter a valid email"),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),

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
const validateAdminForgotPassword = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .matches(/^[\w.-]+@gwa\.amity\.edu$/)
    .withMessage("Email must be an Amity admin email (@gwa.amity.edu)")
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
    .isLength({ max: 100 })
    .withMessage("Description cannot exceed 100 characters"),

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
    .isLength({ max: 100 })
    .withMessage("Description cannot exceed 100 characters"),

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

const validateCompleteProfile = [
  body("block")
    .trim()
    .isIn(["A", "B", "C", "D", "E"])
    .withMessage("Block must be A, B, C, D, or E"),

  body("enrollmentNumber")
    .trim()
    .notEmpty()
    .withMessage("Enrollment number is required")
    .toUpperCase(),

  body("phoneNumber")
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage("Please enter a valid 10-digit phone number"),

  body("course")
    .trim()
    .notEmpty()
    .withMessage("Course is required")
    .isLength({ max: 100 })
    .withMessage("Course name too long"),

  body("branch")
    .trim()
    .notEmpty()
    .withMessage("Branch is required")
    .isLength({ max: 100 })
    .withMessage("Branch name too long"),

  body("year")
    .isInt({ min: 1, max: 4 })
    .withMessage("Year must be between 1 and 4")
    .toInt(),

  body("semester")
    .isInt({ min: 1, max: 8 })
    .withMessage("Semester must be between 1 and 8")
    .toInt(),

body("section")
  .trim()
  .isIn(["A", "B", "C", "D", "E"])
  .withMessage("Section must be A, B, C, D, or E"),

  handleValidationErrors,
];

export {
  validateUserRegistration,
  validateOTPVerification,
  validateLogin,
  validateAdminLogin,
  validateForgotPassword,
  validateVerifyResetOTP,
  validateResetPassword,
  validateLostItem,
  validateFoundItem,
  validateObjectId,
  validatePagination,
  validateAdminForgotPassword,
  validateCompleteProfile
};
