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
} from "./found-item.controller.js";
const router = express.Router();
import {
  protect,
  isAdminOrSecurity,
  isSecurity,
} from "../../shared/middleware/auth.middleware.js";
import {
  validateObjectId,
  validatePagination,
  validatePaginationAllowAll,
} from "../../shared/validation/common.validation.js";
import {
  validateFoundItem,
  validateOfflineReturn,
} from "./found-items.validation.js";
router.use(protect, isAdminOrSecurity);
router.post("/", validateFoundItem, addFoundItem);
router.get("/department", validatePaginationAllowAll, getDepartmentFoundItems);
router.get("/search", searchFoundItems);
router.get("/:id", validateObjectId, getFoundItem);
router.put("/:id/returned", validateObjectId, markAsReturned);

router.put("/:id/collected-offline", validateObjectId,validateOfflineReturn,markAsCollectedOffline);
router.put("/:id/unclaimed", isSecurity,validateObjectId, markAsUnclaimed);
router.get("/:id/matched-lost-items", validateObjectId,getMatchedLostItemsForItem);

router.delete("/:id", validateObjectId, deleteFoundItem);
export default router;
