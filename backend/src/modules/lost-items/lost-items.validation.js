import { body } from "express-validator";
import {
  ALL_LOCATIONS,
  BLOCK_LOCATIONS,
  COLORS,
  COMMON_LOCATIONS,
  ITEM_CONDITIONS,
  ITEM_NAME,
  USER_ROLES,
} from "../../config/constants.js";
import { handleValidationErrors } from "../../shared/validation/validate-request.js";

const getAllowedLocationsForRole = (role, block) => {
  if (role === USER_ROLES.SECURITY) return ALL_LOCATIONS;
  if (role === USER_ROLES.STUDENT || role === USER_ROLES.ADMIN) {
    return [...(BLOCK_LOCATIONS[block] || []), ...COMMON_LOCATIONS];
  }
  return [];
};

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
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

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
    .withMessage("Please select a valid campus location")
    .custom((value, { req }) => {
      const allowedLocations = getAllowedLocationsForRole(
        req.user?.role,
        req.user?.block
      );

      if (
        (req.user?.role === USER_ROLES.STUDENT ||
          req.user?.role === USER_ROLES.ADMIN) &&
        !allowedLocations.includes(value)
      ) {
        throw new Error(
          "You can only select locations from your own block or common campus areas"
        );
      }

      return true;
    }),

  body("contactInfo.phone")
    .optional({ checkFalsy: true })
    .isMobilePhone("en-IN")
    .withMessage("Please provide a valid Indian phone number"),

  handleValidationErrors,
];

export { validateLostItem };
