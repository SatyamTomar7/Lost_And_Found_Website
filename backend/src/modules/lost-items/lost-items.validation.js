import { body } from "express-validator";
import {
  ALL_LOCATIONS,
  COLORS,
  ITEM_CONDITIONS,
  ITEM_NAME,
} from "../../config/constants.js";
import { handleValidationErrors } from "../../shared/validation/validate-request.js";

const getMinAllowedDate = () => {
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() - 6);
  return minDate;
};

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

export { validateLostItem };
