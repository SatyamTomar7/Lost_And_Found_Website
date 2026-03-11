import express from "express";
import {
  addFoundItem,
  deleteFoundItem,
  getDepartmentFoundItems,
  getFoundItem,
  markAsReturned,
  markAsUnclaimed,
  searchFoundItems,
  updateFoundItem,
  getMatchedLostItemsForItem,
  markAsCollectedOffline,
} from "../controllers/founditem.controller.js";
const router = express.Router();
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import {
  validateFoundItem,
  validateObjectId,
  validatePagination,
} from "../middlewares/validation.middleware.js";
router.use(protect, isAdmin);
router.post("/", validateFoundItem, addFoundItem);
router.get("/department", validatePagination, getDepartmentFoundItems);
router.get("/search", searchFoundItems);
router.get("/:id", validateObjectId, getFoundItem);
router.put("/:id", validateObjectId, validateFoundItem, updateFoundItem);
router.put("/:id/returned", validateObjectId, markAsReturned);

router.put("/:id/collected-offline", validateObjectId, markAsCollectedOffline);
router.put("/:id/unclaimed", validateObjectId, markAsUnclaimed);
router.get("/:id/matched-lost-items", getMatchedLostItemsForItem);

router.delete("/:id", validateObjectId, deleteFoundItem);
export default router;
