import express from "express";
import {
  checkFoundItemMatches,
  checkLostItemMatches,
  getMatchingStats,
} from "./match.controller.js";
import {
  isAdminOrSecurity,
  protect,
} from "../../shared/middleware/auth.middleware.js";
import { validateObjectId } from "../../shared/validation/common.validation.js";

const router = express.Router();
router.use(protect);
router.get("/lost/:id", validateObjectId, checkLostItemMatches);
router.get("/found/:id", isAdminOrSecurity, validateObjectId, checkFoundItemMatches);
router.get("/stats", isAdminOrSecurity, getMatchingStats);
export default router;
