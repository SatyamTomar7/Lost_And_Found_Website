import { emailService } from "../services/email.service.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { DEPARTMENTS, USER_ROLES } from "../constants.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser?.isEmailVerified) {
    throw new ApiError(400, "User already exists with this email");
  }

  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    role: USER_ROLES.STUDENT,
  });

  // Generate OTP for email verification
  const otp = user.generateEmailVerificationOTP();
  await user.save();

  let emailSent = false;

  // Try sending email
  try {
    emailSent = await emailService.sendOTPVerification(email, name, otp);
  } catch (error) {
    console.error("Email sending failed", error);
  }

  // Never return password
  // user.password = undefined;

  // Send response
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
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  // 4. Update lastLogin in the background (Non-blocking)
  // We use findByIdAndUpdate to avoid triggering pre-save middlewares
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
