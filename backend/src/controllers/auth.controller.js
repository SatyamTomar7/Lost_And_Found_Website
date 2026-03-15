import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { emailService } from "../services/email.service.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { USER_ROLES } from "../constants.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const isStudentEmail = /^[\w.-]+@s\.amity\.edu$/.test(email);
  if (!isStudentEmail) {
    throw new ApiError(
      400,
      "Please use a valid @s.amity.edu email to register."
    );
  }
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
    const otp = await existingUser.generateEmailVerificationOTP();
    await existingUser.save();

    emailService
      .sendOTPVerification(email, name, otp)
      .catch((err) => console.error("Email sending failed:", err));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          email: existingUser.email,
          name: existingUser.name,
        },
        "Registration successful. Please check your email for OTP verification."
      )
    );
  }

  // Fresh registration — user does not exist at all
  const user = await User.create({
    name,
    email,
    password,
    role: USER_ROLES.STUDENT,
  });

  const otp = await user.generateEmailVerificationOTP();
  await user.save();

  emailService
    .sendOTPVerification(email, name, otp)
    .catch((err) => console.error("Email sending failed:", err));

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        email: user.email,
        name: user.name,
      },
      "Registration successful. Please check your email for OTP verification."
    )
  );
});
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    isEmailVerified: false,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    const exists = await User.findOne({ email }).lean();
    if (!exists) throw new ApiError(404, "User not found");
    if (exists.isEmailVerified)
      throw new ApiError(400, "Email already verified");
    throw new ApiError(400, "Invalid or expired OTP");
  }

  const isOTPValid = await bcrypt.compare(otp, user.emailVerificationOTP);
  if (!isOTPValid) {
    throw new ApiError(400, "Invalid or expired OTP");
  }
  await User.findByIdAndUpdate(user._id, {
    $set: { isEmailVerified: true },
    $unset: {
      emailVerificationOTP: "",
      emailVerificationExpire: "",
    },
  });

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
          isEmailVerified: true,
        },
      },
      "Email verified successfully"
    )
  );
});
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated. Please contact support.");
  }

  if (!user.isEmailVerified) {
    const otp = await user.generateEmailVerificationOTP();
    await user.save();

    emailService
      .sendOTPVerification(user.email, user.name, otp)
      .catch((err) => console.error("Email sending failed:", err));

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

  const lastLoginDate = new Date();
  User.findByIdAndUpdate(user._id, {
    $set: { lastLogin: lastLoginDate },
  }).catch((err) => console.error("Failed to update last login:", err));

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

  const user = await User.findOne({
    email,
    role: USER_ROLES.ADMIN,
    department,
  }).select("+password");

  if (!user) throw new ApiError(401, "Invalid credentials for this department");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  if (!user.isActive) {
    throw new ApiError(403, "Admin account is deactivated");
  }

  const lastLoginDate = new Date();
  User.findByIdAndUpdate(user._id, {
    $set: { lastLogin: lastLoginDate },
  }).catch((err) => console.error("Admin lastLogin update failed:", err));

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
  if (!req.user) {
    throw new ApiError(404, "User session not found");
  }

  const userData = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    ...(req.user.department && { department: req.user.department }),
    profileImage: req.user.profileImage,
    isEmailVerified: req.user.isEmailVerified,
    isActive: req.user.isActive,
    lastLogin: req.user.lastLogin,
    createdAt: req.user.createdAt,
  };

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

  const user = await User.findOne({ email });
  if (!user || user.isEmailVerified) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "If the account exists and is unverified, a new OTP has been sent."
        )
      );
  }
  if (
    user.emailVerificationExpire &&
    user.emailVerificationExpire > new Date(Date.now() + 8 * 60 * 1000)
  ) {
    throw new ApiError(
      429,
      "Please wait 2 minutes before requesting a new OTP."
    );
  }
  const otp = await user.generateEmailVerificationOTP();
  await user.save();

  emailService
    .sendOTPVerification(email, user.name, otp)
    .catch((err) => console.error("Background Email Error:", err));

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
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

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
  if (
    user.passwordResetOTPExpiry &&
    user.passwordResetOTPExpiry > new Date(Date.now() + 8 * 60 * 1000)
  ) {
    throw new ApiError(
      429,
      "Please wait 2 minutes before requesting a new OTP."
    );
  }

  // Generate + hash OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = await bcrypt.hash(otp, 10);
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await User.findByIdAndUpdate(user._id, {
    passwordResetOTP: hashedOTP,
    passwordResetOTPExpiry: otpExpiry,
    passwordResetOTPUsed: false,
  });

  emailService
    .sendPasswordResetOTP(user.email, user.name, otp)
    .catch((err) => console.error("Password reset email error:", err));

  return res.status(200).json(genericResponse);
});

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

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
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

  if (
    admin.passwordResetOTPExpiry &&
    admin.passwordResetOTPExpiry > new Date(Date.now() + 8 * 60 * 1000)
  ) {
    throw new ApiError(
      429,
      "Please wait 2 minutes before requesting a new OTP."
    );
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = await bcrypt.hash(otp, 10);
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await User.findByIdAndUpdate(admin._id, {
    passwordResetOTP: hashedOTP, // ← hashed
    passwordResetOTPExpiry: otpExpiry,
    passwordResetOTPUsed: false,
  });
  emailService
    .sendPasswordResetOTP(admin.email, admin.name, otp)
    .catch((err) => console.error("Admin password reset email error:", err));

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

  if (!admin.passwordResetOTP) {
    throw new ApiError(400, "Invalid or expired OTP");
  }
  if (admin.passwordResetOTPExpiry < new Date()) {
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }
  if (admin.passwordResetOTPUsed) {
    throw new ApiError(400, "OTP has already been used.");
  }
  const isValid = await bcrypt.compare(otp, admin.passwordResetOTP); // ← bcrypt
  if (!isValid) {
    throw new ApiError(400, "Invalid OTP. Please check and try again.");
  }
  await User.findByIdAndUpdate(admin._id, {
    passwordResetOTPUsed: true, // consume OTP so it cant be reused
  });

  const resetToken = jwt.sign(
    { userId: admin._id, purpose: "password_reset" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { resetToken }, "OTP verified successfully."));
});

export const adminResetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || !newPassword || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(400, "Reset session expired. Please start again.");
  }

  if (decoded.purpose !== "password_reset") {
    throw new ApiError(400, "Invalid reset token");
  }

  const admin = await User.findById(decoded.userId);
  if (!admin) throw new ApiError(404, "Admin not found");

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await User.findByIdAndUpdate(admin._id, {
    password: hashedPassword,
    passwordResetOTP: null,
    passwordResetOTPExpiry: null,
    passwordResetOTPUsed: false,
    passwordChangedAt: new Date(), // invalidates all existing JWTs
  });

  emailService
    .sendPasswordResetConfirmation(admin.email, admin.name)
    .catch((err) => console.error("Confirmation email error:", err));

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password reset successfully. Please login.")
    );
});
