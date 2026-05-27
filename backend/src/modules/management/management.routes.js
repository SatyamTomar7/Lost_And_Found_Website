import { Router } from "express";

import {
  getDirectorAnalytics,
  getAllLostItems,
  getAllFoundItems,
  getAllStudents,
  getAllAdmins,
} from "./management.controller.js";

import { protect, isManagement } from "../../shared/middleware/auth.middleware.js";

const router = Router();

// Protect all managements routes
router.use(
  protect,
  isManagement
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

export default router;
