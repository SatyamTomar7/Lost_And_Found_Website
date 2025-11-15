import { Router } from "express";
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
const router = Router();

router.post("/register",validateUserRegistration,register);
router.post("/verify-otp",validateOTPVerification,verifyOTP);
router.post("/resend-otp",resendOTP);
router.post("/login",validateLogin,login);
router.post("/admin-login",validateAdminLogin,adminLogin);

router.get("/me",protect,getMe);
router.post("/logout",protect,logout)



export default router;
