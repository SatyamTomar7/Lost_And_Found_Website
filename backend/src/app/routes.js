import { rateLimit } from "express-rate-limit";
import authRoutes from "../modules/auth/auth.routes.js";
import lostItemRoutes from "../modules/lost-items/lost-items.routes.js";
import foundItemRoutes from "../modules/found-items/found-items.routes.js";
import matchRoutes from "../modules/matching/match.routes.js";
import notificationRoutes from "../modules/notifications/notification.routes.js";
import uploadRoutes from "../modules/uploads/upload.routes.js";
import managementRoutes from "../modules/management/management.routes.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

export const registerRoutes = (app) => {
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/lostitems", apiLimiter, lostItemRoutes);
  app.use("/api/founditems", apiLimiter, foundItemRoutes);
  app.use("/api/matches", apiLimiter, matchRoutes);
  app.use("/api/notifications", apiLimiter, notificationRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/management", managementRoutes);

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Lost and Found API is running",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
};
