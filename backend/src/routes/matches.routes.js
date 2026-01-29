import express from "express"
import { checkFoundItemMatches, checkLostItemMatches, getMatchingStats} from "../controllers/match.controller.js"
import { isAdmin, protect } from "../middlewares/auth.middleware.js";
import { validateObjectId } from "../middlewares/validation.middleware.js";

const router=express.Router();
router.use(protect)
router.get("/lost/:id",validateObjectId,checkLostItemMatches)
router.get("/found/:id",validateObjectId,checkFoundItemMatches)
router.get("/stats",isAdmin,getMatchingStats);
export default router;