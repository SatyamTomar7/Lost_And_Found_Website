// routes/upload.routes.js
import express from "express";
import {
  uploadMultipleImages,
  uploadSingleImage,
  deleteUploadedImage,
} from "./upload.controller.js";
import { protect } from "../../shared/middleware/auth.middleware.js";
import {
  uploadIpLimiter,
  uploadUserLimiter,
} from "./upload-rate-limit.js";

const router = express.Router();
router.use(protect, uploadIpLimiter, uploadUserLimiter);

router.post("/single", uploadSingleImage);
router.post("/multiple", uploadMultipleImages);
router.delete("/*path", deleteUploadedImage);
export default router;
