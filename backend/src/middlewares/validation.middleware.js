import { body, validationResult, param, query } from "express-validator";
import { ApiError } from "../utils/ApiError.js";
import {
  COLORS,
  ITEM_CONDITIONS,
  ITEM_NAME,
  ALL_LOCATIONS,
} from "../constants.js";

const getMinAllowedDate = () => {
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() - 6);
  return minDate;
};

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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
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

const validateForgotPassword = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .matches(/^[\w.-]+@(s|gwa)\.amity\.edu$/)
    .withMessage(
      "Email must be a valid Amity email (@s.amity.edu or @gwa.amity.edu)"
    )
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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
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
      const inputDate = new Date(value);
      inputDate.setHours(0, 0, 0, 0);

      if (inputDate < getMinAllowedDate()) {
        throw new Error("Date lost must be within the last 7 days");
      }

      if (new Date(value) > new Date()) {
        throw new Error("Date lost cannot be in the future");
      }
      return true;
    }),

  body("placeLost")
    .isIn(ALL_LOCATIONS)
    .withMessage("Please select a valid ALL location"),

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
      const inputDate = new Date(value);
      inputDate.setHours(0, 0, 0, 0);

      if (inputDate < getMinAllowedDate()) {
        throw new Error("Date found must be within the last 7 days");
      }

      if (new Date(value) > new Date()) {
        throw new Error("Date found cannot be in the future");
      }
      return true;
    }),

  body("placeFound")
    .isIn(ALL_LOCATIONS)
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
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Enter a valid 10-digit Indian mobile number"),

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
    .trim()
    .isIn(["1", "2", "3", "4"])
    .withMessage("Invalid year selected"),
  body("semester")
    .trim()
    .notEmpty()
    .withMessage("Semester is required")
    .isInt({ min: 1, max: 8 })
    .withMessage("Semester must be a number between 1 and 8"),

  body("section")
    .trim()
    .isIn(["A", "B", "C", "D", "E"])
    .withMessage("Section must be A, B, C, D, or E"),

  handleValidationErrors,
];
const validateOfflineReturn = [
  param("id").isMongoId().withMessage("Invalid ID format"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name is too long"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address"),

  body("enrollmentNumber")
    .trim()
    .notEmpty()
    .withMessage("Enrollment number is required")
    .isLength({ max: 50 })
    .withMessage("Enrollment number is too long"),

  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid phone number"),

  body("course")
    .trim()
    .notEmpty()
    .withMessage("Course is required")
    .isLength({ max: 100 })
    .withMessage("Course name is too long"),

  body("branch")
    .trim()
    .notEmpty()
    .withMessage("Branch is required")
    .isLength({ max: 100 })
    .withMessage("Branch name is too long"),

  body("semester")
    .trim()
    .notEmpty()
    .withMessage("Semester is required")
    .isLength({ max: 20 })
    .withMessage("Semester value is too long"),

  body("block")
    .trim()
    .notEmpty()
    .withMessage("Block is required")
    .isLength({ max: 20 })
    .withMessage("Block value is too long"),

  handleValidationErrors,
];
export {
  validateUserRegistration,
  validateOTPVerification,
  validateLogin,
  validateForgotPassword,
  validateVerifyResetOTP,
  validateResetPassword,
  validateLostItem,
  validateFoundItem,
  validateObjectId,
  validatePagination,
  validateCompleteProfile,
  validateOfflineReturn,
};
