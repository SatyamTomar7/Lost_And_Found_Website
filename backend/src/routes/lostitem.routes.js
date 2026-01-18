import express from "express";
import {
  submitLostItem,
  getLostItem,
  getMyLostItems,
  updateLostItem,
  deleteLostItem,
  markAsCollected,
  searchLostItems,
} from "../controllers/lostitem.controller.js";

import { protect,isAdmin,isStudent } from "../middlewares/auth.middleware.js";

import { validateLostItem,validateObjectId,validatePagination } from "../middlewares/validation.middleware.js";

const router=express.Router();
//student routes
router.post("/",protect,isStudent,validateLostItem,submitLostItem);
router.get("/my",protect,isStudent,validatePagination,getMyLostItems);
router.get("/search",protect,searchLostItems);
router.get("/:id",protect,validateObjectId,getLostItem);
router.put("/:id",protect,isStudent,validateObjectId,validateLostItem,updateLostItem);
router.delete("/:id",protect,isStudent,validateObjectId,deleteLostItem);

//Admin routes
router.put("/:id/collected",protect,isAdmin,validateObjectId,markAsCollected);
export default router;