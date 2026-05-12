import express from "express";
import {
  submitLostItem,
  getLostItem,
  getMyLostItems,
  deleteLostItem,
  searchLostItems,
  selfResolveLostItem,
} from "../controllers/lostitem.controller.js";

import { protect,isAdmin,isStudent } from "../middlewares/auth.middleware.js";

import { validateLostItem,validateObjectId,validatePagination } from "../middlewares/validation.middleware.js";

const router=express.Router();
//student routes
router.post("/",protect,isStudent,validateLostItem,submitLostItem);
router.get("/my",protect,isStudent,validatePagination,getMyLostItems);
router.get("/search",protect,validatePagination,searchLostItems);
router.get("/:id",protect,isStudent,validateObjectId,getLostItem);
router.delete("/:id",protect,isStudent,validateObjectId,deleteLostItem);
router.patch("/:id/self-resolve",protect,isStudent, selfResolveLostItem);
export default router;