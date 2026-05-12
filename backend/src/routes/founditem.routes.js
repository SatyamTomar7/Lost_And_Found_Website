import express from "express";
import {
  addFoundItem,
  deleteFoundItem,
  getDepartmentFoundItems,
  getFoundItem,
  markAsReturned,
  markAsUnclaimed,
  searchFoundItems,
  getMatchedLostItemsForItem,
  markAsCollectedOffline,
} from "../controllers/founditem.controller.js";
const router = express.Router();
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import {
  validateFoundItem,
  validateObjectId,
  validatePagination,
  validateOfflineReturn
} from "../middlewares/validation.middleware.js";
router.use(protect, isAdmin);
router.post("/", validateFoundItem, addFoundItem);
router.get("/department", validatePagination, getDepartmentFoundItems);
router.get("/search", searchFoundItems);
router.get("/:id", validateObjectId, getFoundItem);
router.put("/:id/returned", validateObjectId, markAsReturned);

router.put("/:id/collected-offline", validateObjectId,validateOfflineReturn,markAsCollectedOffline);
router.put("/:id/unclaimed", validateObjectId, markAsUnclaimed);
router.get("/:id/matched-lost-items", validateObjectId,getMatchedLostItemsForItem);

router.delete("/:id", validateObjectId, deleteFoundItem);
export default router;
