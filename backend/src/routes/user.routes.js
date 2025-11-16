import { Router } from "express";
import app from "../app.js"
import {
  adminLogin,
  getMe,
  logout,
  register,
  resendOTP,
  verifyOTP,
  login
} from "../controllers/auth.controller.js";
import {protect} from "../middlewares/auth.middleware.js"
import { validateAdminLogin, validateLogin, validateOTPVerification, validateUserRegistration } from "../middlewares/validation.middleware.js";
import { errorHandler } from "../middlewares/errorHandler.middlewares.js";
const router = Router();

router.post("/register",validateUserRegistration,register);
router.post("/verify-otp",validateOTPVerification,verifyOTP);
router.post("/resend-otp",resendOTP);
router.post("/login",validateLogin,login);
router.post("/admin-login",validateAdminLogin,adminLogin);

router.get("/me",protect,getMe);
router.post("/logout",protect,logout)


app.use(errorHandler)
export default router;
