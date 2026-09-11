import { Router } from "express";

import {
  getDirectorAnalytics,
  getAllLostItems,
  getAllFoundItems,
  getAllStudents,
  getAllAdmins,
  deleteStudent,
  deleteLostItem,
  deleteFoundItem,
} from "./management.controller.js";

import {
  protect,
  authorizeRoles,
} from "../../shared/middleware/auth.middleware.js";
import { USER_ROLES } from "../../config/constants.js";

const router = Router();

// Protect all managements routes
router.use(
  protect,
  authorizeRoles(
    USER_ROLES.DIRECTOR,
    USER_ROLES.SECURITY,
    USER_ROLES.SUPER_ADMIN
  )
);

// Analytics
router.get("/analytics", getDirectorAnalytics);

// Lost Items
router.get("/lostitems", getAllLostItems);

// Found Items
router.get("/founditems", getAllFoundItems);

// Students
router.get("/students", getAllStudents);

// Admins + Security
router.get("/admins", getAllAdmins);

router.delete(
  "/students/:id",
  authorizeRoles(USER_ROLES.SUPER_ADMIN),
  deleteStudent
);
router.delete(
  "/lostitems/:id",
  authorizeRoles(USER_ROLES.SUPER_ADMIN),
  deleteLostItem
);
router.delete(
  "/founditems/:id",
  authorizeRoles(USER_ROLES.SUPER_ADMIN),
  deleteFoundItem
);

export default router;
