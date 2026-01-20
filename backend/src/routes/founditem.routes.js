import express from "express"
import { addFoundItem, getDepartmentFoundItems, getFoundItem } from "../controllers/founditem.controller.js";
const router=express.Router();
import { protect ,isAdmin} from "../middlewares/auth.middleware.js"
import { validateFoundItem, validateObjectId, validatePagination } from "../middlewares/validation.middleware.js";
router.use(protect,isAdmin);
router.post("/",validateFoundItem,addFoundItem);
router.get("/department",validatePagination,getDepartmentFoundItems);
router.get("/:id",validateObjectId,getFoundItem);

export default router;