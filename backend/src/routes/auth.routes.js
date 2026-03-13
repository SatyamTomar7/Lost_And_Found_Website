// import { Router } from "express";
// import {
//   adminLogin,
//   getMe,
//   logout,
//   register,
//   resendOTP,
//   verifyOTP,
//   login,
//   forgotPassword,
//   verifyResetOTP,
//   resetPassword,
// } from "../controllers/auth.controller.js";
// import { protect } from "../middlewares/auth.middleware.js";
// import {
//   validateAdminLogin,
//   validateLogin,
//   validateOTPVerification,
//   validateUserRegistration,
// } from "../middlewares/validation.middleware.js";
// const router = Router();

// router.post("/register", validateUserRegistration, register);
// router.post("/verify-otp", validateOTPVerification, verifyOTP);
// router.post("/resend-otp", resendOTP);
// router.post("/login", validateLogin, login);
// router.post("/admin-login", validateAdminLogin, adminLogin);

// router.get("/me", protect, getMe);
// router.post("/logout", protect, logout);

// router.post("/forgot-password", forgotPassword);
// router.post("/verify-reset-otp", verifyResetOTP);
// router.post("/reset-password", resetPassword);

// export default router;

// import { Router } from "express";
// import {
//   adminLogin,
//   getMe,
//   logout,
//   register,
//   resendOTP,
//   verifyOTP,
//   login,
//   forgotPassword,
//   verifyResetOTP,
//   resetPassword,
// } from "../controllers/auth.controller.js";
// import { protect } from "../middlewares/auth.middleware.js";
// import {
//   validateAdminLogin,
//   validateLogin,
//   validateOTPVerification,
//   validateUserRegistration,
//   validateForgotPassword,
//   validateVerifyResetOTP,
//   validateResetPassword,
// } from "../middlewares/validation.middleware.js";

// const router = Router();

// router.post("/register", validateUserRegistration, register);
// router.post("/verify-otp", validateOTPVerification, verifyOTP);
// router.post("/resend-otp", resendOTP);
// router.post("/login", validateLogin, login);
// router.post("/admin-login", validateAdminLogin, adminLogin);

// router.get("/me", protect, getMe);
// router.post("/logout", protect, logout);

// router.post("/forgot-password", validateForgotPassword, forgotPassword);
// router.post("/verify-reset-otp", validateVerifyResetOTP, verifyResetOTP);
// router.post("/reset-password", validateResetPassword, resetPassword);

// export default router;

import { Router } from "express";
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
  adminForgotPassword,      // ADDED
  adminVerifyResetOTP,      // ADDED
  adminResetPassword,       // ADDED
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
} from "../middlewares/validation.middleware.js";

const router = Router();

router.post("/register", validateUserRegistration, register);
router.post("/verify-otp", validateOTPVerification, verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", validateLogin, login);
router.post("/admin-login", validateAdminLogin, adminLogin);

router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/verify-reset-otp", validateVerifyResetOTP, verifyResetOTP);
router.post("/reset-password", validateResetPassword, resetPassword);

// ADDED: Admin forgot password routes
// Reuse the same validators as student flow — same field names, same rules
router.post("/admin/forgot-password", validateForgotPassword, adminForgotPassword);
router.post("/admin/verify-reset-otp", validateVerifyResetOTP, adminVerifyResetOTP);
router.post("/admin/reset-password", validateResetPassword, adminResetPassword);

export default router;