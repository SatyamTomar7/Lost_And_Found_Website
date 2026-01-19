import express from "express"
import { addFoundItem } from "../controllers/founditem.controller.js";
const router=express.Router();
import { protect ,isAdmin} from "../middlewares/auth.middleware.js"
import { validateFoundItem } from "../middlewares/validation.middleware.js";
router.use(protect,isAdmin);
router.post("/",validateFoundItem,addFoundItem);

export default router;