import { Router } from "express";
import { USER_ROLES } from "../../config/constants.js";
import {
  authorizeRoles,
  protect,
} from "../../shared/middleware/auth.middleware.js";
import {
  getAdminAssignments,
  listAssignmentHistory,
  updateAdminAssignments,
} from "./admin-management.controller.js";
import { validateAssignmentUpdate } from "./admin-management.validation.js";

const router = Router();

router.use(protect, authorizeRoles(USER_ROLES.SUPER_ADMIN));
router.get("/admins", getAdminAssignments);
router.put("/departments", validateAssignmentUpdate, updateAdminAssignments);
router.get("/history", listAssignmentHistory);

export default router;
