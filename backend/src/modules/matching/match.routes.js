import express from "express";
import {
  checkFoundItemMatches,
  checkLostItemMatches,
  getMatchingStats,
} from "./match.controller.js";
import { isAdmin, protect } from "../../shared/middleware/auth.middleware.js";
import { validateObjectId } from "../../shared/validation/common.validation.js";

const router = express.Router();
router.use(protect);
router.get("/lost/:id", validateObjectId, checkLostItemMatches);
router.get("/found/:id", isAdmin, validateObjectId, checkFoundItemMatches);
router.get("/stats", isAdmin, getMatchingStats);
export default router;
