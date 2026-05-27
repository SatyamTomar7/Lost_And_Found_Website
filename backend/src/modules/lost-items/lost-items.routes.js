import express from "express";
import {
  submitLostItem,
  getLostItem,
  getMyLostItems,
  deleteLostItem,
  searchLostItems,
  selfResolveLostItem,
} from "./lost-item.controller.js";

import {
  protect,
  isAdmin,
  isStudent,
} from "../../shared/middleware/auth.middleware.js";

import { validateObjectId, validatePagination } from "../../shared/validation/common.validation.js";
import { validateLostItem } from "./lost-items.validation.js";

const router=express.Router();
//student routes
router.post("/",protect,isStudent,validateLostItem,submitLostItem);
router.get("/my",protect,isStudent,validatePagination,getMyLostItems);
router.get("/search",protect,validatePagination,searchLostItems);
router.get("/:id",protect,isStudent,validateObjectId,getLostItem);
router.delete("/:id",protect,isStudent,validateObjectId,deleteLostItem);
router.patch("/:id/self-resolve",protect,isStudent, selfResolveLostItem);
export default router;
