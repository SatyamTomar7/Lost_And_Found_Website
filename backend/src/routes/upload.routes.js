import express from "express";
import {
  uploadMultipleImages,
  uploadSingleImage,
  deleteUploadedImage,
} from "../controllers/upload.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateObjectId } from "../middlewares/validation.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/single", uploadSingleImage);
router.post("/multiple", uploadMultipleImages);
router.delete("/:publicId", deleteUploadedImage);

export default router;
