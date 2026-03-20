import express from "express"
import { deleteNotification, getNotifications, getNotificationStats, markAllAsRead, markAsRead } from "../controllers/notification.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateObjectId, validatePagination } from "../middlewares/validation.middleware.js";

const router=express.Router();
router.use(protect);
router.get("/",validatePagination,getNotifications);
router.get("/stats",getNotificationStats);
router.put("/read-all",markAllAsRead);
router.put("/:id/read",markAsRead);
router.delete("/:id",validateObjectId,deleteNotification)

export default router;