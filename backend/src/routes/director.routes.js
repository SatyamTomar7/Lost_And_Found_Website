import { Router } from "express";

import {
  getDirectorAnalytics,
  getAllLostItems,
  getAllFoundItems,
  getAllStudents,
  getAllAdmins,
} from "../controllers/director.controller.js";

import { protect, isDirector } from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all director routes
router.use(
  protect,
  isDirector
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