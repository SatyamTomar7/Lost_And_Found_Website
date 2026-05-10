import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  getMe,
  logout,
  register,
  resendOTP,
  verifyOTP,
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  completeProfile,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  validateLogin,
  validateOTPVerification,
  validateUserRegistration,
  validateForgotPassword,
  validateVerifyResetOTP,
  validateResetPassword,
  validateCompleteProfile,
} from "../middlewares/validation.middleware.js";

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post("/register", validateUserRegistration, register);
router.post("/verify-otp", validateOTPVerification, verifyOTP);
router.post("/resend-otp", otpLimiter, resendOTP);
router.post("/login", validateLogin, login);

router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.patch(
  "/complete-profile",
  protect,
  validateCompleteProfile,
  completeProfile
);
router.post(
  "/forgot-password",
  otpLimiter,
  validateForgotPassword,
  forgotPassword
);
router.post("/verify-reset-otp", validateVerifyResetOTP, verifyResetOTP);
router.post("/reset-password", validateResetPassword, resetPassword);
export default router;
