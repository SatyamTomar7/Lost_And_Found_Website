import express from "express";
import {
  uploadMultipleImages,
  uploadSingleimage,
  DeleteImage,
} from "../controllers/upload.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/single", uploadSingleimage);
router.post("/multiple", uploadMultipleImages);
router.delete("/:publicId", DeleteImage);

export default router;
