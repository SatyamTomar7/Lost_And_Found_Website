// routes/upload.routes.js
import express from "express";
import {
  uploadMultipleImages,
  uploadSingleImage,
  deleteUploadedImage,
} from "./upload.controller.js";
import { protect } from "../../shared/middleware/auth.middleware.js";

const router = express.Router();
router.use(protect);

router.post("/single", uploadSingleImage);
router.post("/multiple", uploadMultipleImages);
router.delete("/*path", deleteUploadedImage);
export default router;
