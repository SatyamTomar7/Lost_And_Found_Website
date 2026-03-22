import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  adminLogin,
  getMe,
  logout,
  register,
  resendOTP,
  verifyOTP,
  login,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  adminForgotPassword, // ADDED
  adminVerifyResetOTP, // ADDED
  adminResetPassword, // ADDED
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  validateAdminLogin,
  validateLogin,
  validateOTPVerification,
  validateUserRegistration,
  validateForgotPassword,
  validateVerifyResetOTP,
  validateResetPassword,
  validateAdminForgotPassword,
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
router.post("/admin-login", validateAdminLogin, adminLogin);

router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

router.post(
  "/forgot-password",
  otpLimiter,
  validateForgotPassword,
  forgotPassword
);
router.post("/verify-reset-otp", validateVerifyResetOTP, verifyResetOTP);
router.post("/reset-password", validateResetPassword, resetPassword);

router.post(
  "/admin/forgot-password",
  otpLimiter,
  validateAdminForgotPassword,
  adminForgotPassword
);
router.post(
  "/admin/verify-reset-otp",
  validateVerifyResetOTP,
  adminVerifyResetOTP
);
router.post("/admin/reset-password", validateResetPassword, adminResetPassword);

export default router;
