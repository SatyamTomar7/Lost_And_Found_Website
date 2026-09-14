import { body } from "express-validator";
import { handleValidationErrors } from "../../shared/validation/validate-request.js";
import { COURSE_BRANCHES, COURSES } from "../../config/constants.js";

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

const validateResendOTP = [
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
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
    .isIn(COURSES)
    .withMessage("Invalid course selected")
    .isLength({ max: 100 })
    .withMessage("Course name too long"),

  body("branch")
    .trim()
    .notEmpty()
    .withMessage("Branch is required")
    .custom((branch, { req }) => {
      const course = req.body.course?.trim();
      const allowedBranches = COURSE_BRANCHES[course] || [];

      if (!allowedBranches.includes(branch)) {
        throw new Error("Selected branch is not valid for the chosen course");
      }

      return true;
    })
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

export {
  validateCompleteProfile,
  validateForgotPassword,
  validateLogin,
  validateOTPVerification,
  validateResetPassword,
  validateResendOTP,
  validateUserRegistration,
  validateVerifyResetOTP,
};
