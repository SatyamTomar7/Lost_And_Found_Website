import { body, param } from "express-validator";
import {
  ALL_LOCATIONS,
  COLORS,
  FOUND_ITEM_RECOVERY_MODES,
  ITEM_CONDITIONS,
  ITEM_NAME,
} from "../../config/constants.js";
import { handleValidationErrors } from "../../shared/validation/validate-request.js";

const getMinAllowedDate = (recoveryMode = FOUND_ITEM_RECOVERY_MODES.NORMAL) => {
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(
    minDate.getDate() -
      (recoveryMode === FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED ? 29 : 6)
  );
  return minDate;
};

const validateFoundItem = [
  body("recoveryMode")
    .optional()
    .isIn(Object.values(FOUND_ITEM_RECOVERY_MODES))
    .withMessage("Invalid recovery mode selected")
    .custom((value, { req }) => {
      if (
        req.user?.role !== "security" &&
        value === FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED
      ) {
        throw new Error(
          "Only security users can create enquiry recovered found items"
        );
      }
      return true;
    }),

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
    .custom((value, { req }) => {
      const recoveryMode =
        req.body.recoveryMode || FOUND_ITEM_RECOVERY_MODES.NORMAL;
      const inputDate = new Date(value);
      inputDate.setHours(0, 0, 0, 0);

      if (inputDate < getMinAllowedDate(recoveryMode)) {
        throw new Error(
          recoveryMode === FOUND_ITEM_RECOVERY_MODES.ENQUIRY_RECOVERED
            ? "Date found must be within the last 30 days"
            : "Date found must be within the last 7 days"
        );
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

export { validateFoundItem, validateOfflineReturn };
