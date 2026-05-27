import express from "express";
import {
  deleteNotification,
  getNotifications,
  getNotificationStats,
  markAllAsRead,
  markAsRead,
} from "./notification.controller.js";
import { protect } from "../../shared/middleware/auth.middleware.js";
import {
  validateObjectId,
  validatePagination,
} from "../../shared/validation/common.validation.js";

const router = express.Router();
router.use(protect);
router.get("/", validatePagination, getNotifications);
router.get("/stats", getNotificationStats);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", validateObjectId, deleteNotification);

export default router;
