import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { emailService } from "../services/email.service.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { DEPARTMENTS, USER_ROLES } from "../constants.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // ── UPSERT LOGIC ──────────────────────────────────────────────────────────
  // Check if user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    // Already fully verified → block
    if (existingUser.isEmailVerified) {
      throw new ApiError(400, "User already exists with this email");
    }

    // Exists but unverified → update their details and resend OTP
    existingUser.name = name;
    existingUser.password = password; // pre-save hook will re-hash it
    const otp = existingUser.generateEmailVerificationOTP();
    await existingUser.save();

    let emailSent = false;
    try {
      emailSent = await emailService.sendOTPVerification(email, name, otp);
    } catch (error) {
      console.error("Email sending failed", error);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          email: existingUser.email,
          name: existingUser.name,
          otpSent: !!emailSent,
        },
        emailSent
          ? "OTP resent. Please check your email for verification."
          : "Account found but failed to send OTP email. Try again later."
      )
    );
  }
  // ── END UPSERT LOGIC ──────────────────────────────────────────────────────

  // Fresh registration — user does not exist at all
  const user = await User.create({
    name,
    email,
    password,
    role: USER_ROLES.STUDENT,
  });

  const otp = user.generateEmailVerificationOTP();
  await user.save();

  let emailSent = false;
  try {
    emailSent = await emailService.sendOTPVerification(email, name, otp);
  } catch (error) {
    console.error("Email sending failed", error);
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        email: user.email,
        name: user.name,
        otpSent: !!emailSent,
      },
      emailSent
        ? "Registration successful. Please check your email for OTP verification."
        : "Registration successful, but failed to send OTP email. Try again later."
    )
  );
});
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // 1. Atomic Update & Verification
  // We filter by email AND the correct/unexpired OTP in one go.
  // This prevents race conditions and is much faster.
  const user = await User.findOneAndUpdate(
    {
      email,
      emailVerificationOTP: otp,
      emailVerificationExpire: { $gt: Date.now() },
      isEmailVerified: false,
    },
    {
      $set: { isEmailVerified: true },
      $unset: {
        emailVerificationOTP: "",
        emailVerificationExpire: "",
      },
    },
    { new: true }
  );

  // 2. Clear Error Handling
  if (!user) {
    // Check if user exists at all to give a better error message
    const exists = await User.findOne({ email }).lean();
    if (!exists) throw new ApiError(404, "User not found");
    if (exists.isEmailVerified)
      throw new ApiError(400, "Email already verified");
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // 3. Generate Access Token
  const token = user.getJWTToken();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
      "Email verified successfully"
    )
  );
});
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Fetch user with password
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password");

  // 2. Validate Credentials
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  // 3. Status Checks
  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated. Please contact support.");
  }

  // ── STUCK STATE FIX ───────────────────────────────────────────────────────
  // Credentials are correct but email was never verified.
  // Auto-send a fresh OTP and return a specific message so the
  // frontend can redirect the user straight to the OTP screen.
  if (!user.isEmailVerified) {
    const otp = user.generateEmailVerificationOTP();
    await user.save();

    try {
      await emailService.sendOTPVerification(user.email, user.name, otp);
    } catch (error) {
      console.error("Email sending failed", error);
    }

    return res.status(403).json(
      new ApiResponse(
        403,
        {
          email: user.email,
          name: user.name,
        },
        "ACCOUNT_NOT_VERIFIED"
      )
    );
  }
  // ── END FIX ───────────────────────────────────────────────────────────────

  // 4. Update lastLogin in the background (Non-blocking)
  const lastLoginDate = new Date();
  User.findByIdAndUpdate(user._id, {
    $set: { lastLogin: lastLoginDate },
  }).catch((err) => console.error("Failed to update last login:", err));

  // 5. Generate Token and Respond
  const token = user.getJWTToken();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
          lastLogin: lastLoginDate,
          createdAt: user.createdAt,
        },
      },
      "Login successful"
    )
  );
});
export const adminLogin = asyncHandler(async (req, res) => {
  const { username, password, department } = req.body;
  const email = `${username}@gwa.amity.edu`;

  // 1. Strict Query: Find admin only if they belong to the specified department
  const user = await User.findOne({
    email,
    role: USER_ROLES.ADMIN,
    department,
  }).select("+password");

  if (!user) throw new ApiError(401, "Invalid credentials for this department");

  // 2. Credential & Status Validation
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  if (!user.isActive) {
    throw new ApiError(403, "Admin account is deactivated");
  }

  // 3. Optimized Background Update
  const lastLoginDate = new Date();
  User.findByIdAndUpdate(user._id, {
    $set: { lastLogin: lastLoginDate },
  }).catch((err) => console.error("Admin lastLogin update failed:", err));

  // 4. Generate Session Token
  const token = user.getJWTToken();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          lastLogin: lastLoginDate,
        },
      },
      "Admin login successful"
    )
  );
});
export const getMe = asyncHandler(async (req, res) => {
  // 1. Validation
  // Usually, your auth middleware ensures req.user exists.
  // If it doesn't, the middleware would have already thrown a 401.
  if (!req.user) {
    throw new ApiError(404, "User session not found");
  }

  // 2. Data Selection (The "Now" standard for security)
  // We pick exactly what the frontend needs to build the profile UI.
  const userData = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    department: req.user.department,
    profileImage: req.user.profileImage,
    isEmailVerified: req.user.isEmailVerified,
    isActive: req.user.isActive,
    lastLogin: req.user.lastLogin,
    createdAt: req.user.createdAt,
  };

  // 3. Structured Response
  return res
    .status(200)
    .json(new ApiResponse(200, userData, "User details fetched successfully"));
});
export const logout = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});
export const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // 1. Fetch user lightly to check status
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (user.isEmailVerified) throw new ApiError(400, "Email already verified");

  // 2. Rate Limiting Check (Now standard practice)
  // Check if the previous OTP was sent less than 60 seconds ago
  const canResend =
    !user.emailVerificationExpire ||
    user.emailVerificationExpire.getTime() - Date.now() < 9 * 60000;
  // Assumes 10-min expiry; allows resend after 1 min has passed

  if (!canResend) {
    throw new ApiError(
      429,
      "Please wait a moment before requesting a new OTP."
    );
  }

  // 3. Generate New OTP
  const otp = user.generateEmailVerificationOTP();

  // 4. Fire-and-Forget Email
  emailService
    .sendOTPVerification(email, user.name, otp)
    .catch((err) => console.error("Background Email Error:", err));

  // 5. Instant Response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email: user.email },
        "If the account exists and is unverified, a new OTP has been sent."
      )
    );
});
// ── Step 1: Request Reset OTP ─────────────────────────────────────────────────
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Same response whether user exists or not — prevents email enumeration
  const genericResponse = new ApiResponse(
    200,
    {},
    "If this email exists in our system, an OTP has been sent."
  );

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(200).json(genericResponse);
  }

  // Rate limit: block if OTP was sent less than 2 minutes ago
  // if (
  //   user.passwordResetOTPExpiry &&
  //   user.passwordResetOTPExpiry > new Date(Date.now() - 8 * 60 * 1000)
  // ) {
  //   throw new ApiError(
  //     429,
  //     "Please wait 2 minutes before requesting a new OTP."
  //   );
  // }

  // Generate + hash OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = await bcrypt.hash(otp, 10);
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await User.findByIdAndUpdate(user._id, {
    passwordResetOTP: hashedOTP,
    passwordResetOTPExpiry: otpExpiry,
    passwordResetOTPUsed: false,
  });

  await emailService.sendPasswordResetOTP(user.email, user.name, otp);

  return res.status(200).json(genericResponse);
});

// ── Step 2: Verify Reset OTP ──────────────────────────────────────────────────
export const verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user || !user.passwordResetOTP) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  if (user.passwordResetOTPExpiry < new Date()) {
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  if (user.passwordResetOTPUsed) {
    throw new ApiError(
      400,
      "OTP has already been used. Please request a new one."
    );
  }

  const isOTPValid = await bcrypt.compare(otp, user.passwordResetOTP);
  if (!isOTPValid) {
    throw new ApiError(400, "Invalid OTP. Please check and try again.");
  }

  // Mark OTP used so it cannot be reused
  await User.findByIdAndUpdate(user._id, {
    passwordResetOTPUsed: true,
  });

  // Issue short-lived reset token (10 min window to set password)
  const resetToken = jwt.sign(
    { userId: user._id, purpose: "password_reset" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { resetToken }, "OTP verified successfully"));
});

// ── Step 3: Reset Password ────────────────────────────────────────────────────
export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  // Verify reset token
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(400, "Reset session expired. Please start again.");
  }

  if (decoded.purpose !== "password_reset") {
    throw new ApiError(400, "Invalid reset token");
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await User.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    passwordResetOTP: null,
    passwordResetOTPExpiry: null,
    passwordResetOTPUsed: false,
    passwordChangedAt: new Date(), // invalidates all existing JWTs
  });

  emailService
    .sendPasswordResetConfirmation(user.email, user.name)
    .catch((err) => console.error("Confirmation email error:", err));

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password reset successfully. Please log in.")
    );
});

// ── ADDED: Admin forgot password flow ────────────────────────────────────────

export const adminForgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const admin = await User.findOne({ email });

  // Always respond the same way to prevent email enumeration
  if (!admin) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "If this admin email exists, an OTP has been sent."
        )
      );
  }

  const otp = admin.generatePasswordResetOTP(); // same method pattern as User model
  await admin.save();

  try {
    await emailService.sendOTPVerification(
      email,
      admin.name || admin.username,
      otp
    );
  } catch (error) {
    console.error("Email sending failed:", error);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If this admin email exists, an OTP has been sent."
      )
    );
});

export const adminVerifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const admin = await User.findOne({ email });
  if (!admin) throw new ApiError(400, "Invalid or expired OTP");

  const isValid = admin.verifyPasswordResetOTP(otp); // same method pattern as User model
  if (!isValid) throw new ApiError(400, "Invalid or expired OTP");

  // Generate a short-lived reset token
  const resetToken = admin.generatePasswordResetToken(); // signs a JWT or sets a field
  await admin.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { resetToken }, "OTP verified successfully."));
});

export const adminResetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  // Verify and decode the reset token to find the admin
  const admin = await User.findOne({
    passwordResetToken: resetToken,
    passwordResetTokenExpiry: { $gt: Date.now() }, // FIXED: was passwordResetExpiry
  });
  if (!admin) throw new ApiError(400, "Reset token is invalid or has expired");

  admin.password = newPassword; // pre-save hook will hash it
  admin.passwordResetToken = undefined;
  admin.passwordResetTokenExpiry = undefined;
  await admin.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password reset successfully. Please login.")
    );
});
