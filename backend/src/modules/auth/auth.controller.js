import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { USER_ROLES } from "../../config/constants.js";
import { emailService } from "../../shared/services/email.service.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { User } from "./User.model.js";
import {
  consumePasswordResetSession,
  createPasswordResetToken,
  verifyPasswordResetToken,
} from "./password-reset.service.js";
import {
  clearRefreshCookie,
  createRefreshSession,
  readRefreshToken,
  REFRESH_COOKIE_NAME,
  revokeRefreshSessions,
  revokeRefreshToken,
  rotateRefreshSession,
  getRefreshCookieOptions,
} from "./refresh-session.service.js";

const issueSession = async (user, res) => {
  const { token, session } = await createRefreshSession(user._id);
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
  return { token: user.getJWTToken(), session };
};

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
    const cooldown = 2 * 60 * 1000;

    if (
      existingUser.otpLastSentAt &&
      Date.now() - existingUser.otpLastSentAt.getTime() < cooldown
    ) {
      throw new ApiError(429, "Please wait 2 minutes before trying again.");
    }

    existingUser.name = name;
    existingUser.password = password;
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
  }).select("+emailVerificationOTP +emailVerificationOTPUsed");

  if (!user) {
    const exists = await User.findOne({ email }).lean();
    if (!exists) throw new ApiError(404, "User not found");
    if (exists.isEmailVerified)
      throw new ApiError(400, "Email already verified");
    throw new ApiError(400, "Invalid or expired OTP");
  }
  if (user.emailVerificationOTPUsed) {
    throw new ApiError(400, "OTP already used. Please request a new one.");
  }

  const isOTPValid = await bcrypt.compare(otp, user.emailVerificationOTP);
  if (!isOTPValid) {
    throw new ApiError(400, "Invalid or expired OTP");
  }
  await User.findByIdAndUpdate(user._id, {
    $set: { isEmailVerified: true, emailVerificationOTPUsed: true },
    $unset: {
      emailVerificationOTP: "",
      emailVerificationExpire: "",
      otpLastSentAt: "",
    },
  });

  const { token } = await issueSession(user, res);

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
export const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(404, "User session not found");
  }

  const baseUserData = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    profileImage: req.user.profileImage,
    isEmailVerified: req.user.isEmailVerified,
    profileCompleted: req.user.profileCompleted,
    isActive: req.user.isActive,
    lastLogin: req.user.lastLogin,
    createdAt: req.user.createdAt,
  };

  let userData = baseUserData;

  if (req.user.role === USER_ROLES.STUDENT) {
    userData = {
      ...baseUserData,
      enrollmentNumber: req.user.enrollmentNumber,
      phoneNumber: req.user.phoneNumber,
      course: req.user.course,
      branch: req.user.branch,
      year: req.user.year,
      semester: req.user.semester,
      section: req.user.section,
      block: req.user.block,
    };
  } else if (req.user.block) {
    userData = {
      ...baseUserData,
      block: req.user.block,
    };
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userData, "User details fetched successfully"));
});
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = readRefreshToken(req);
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearRefreshCookie(res);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = readRefreshToken(req);
  if (!refreshToken) {
    clearRefreshCookie(res);
    throw new ApiError(401, "Refresh session is required");
  }

  const result = await rotateRefreshSession(refreshToken);
  if (result.kind !== "rotated") {
    clearRefreshCookie(res);
    throw new ApiError(401, "Refresh session is invalid or expired");
  }

  const user = await User.findById(result.session.userId).select("-password");
  if (!user || !user.isActive || !user.isEmailVerified) {
    await revokeRefreshSessions(result.session.userId);
    clearRefreshCookie(res);
    throw new ApiError(401, "Refresh session is invalid");
  }

  res.cookie(REFRESH_COOKIE_NAME, result.token, getRefreshCookieOptions());
  return res
    .status(200)
    .json(new ApiResponse(200, { token: user.getJWTToken() }, "Token refreshed"));
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
  const cooldown = 2 * 60 * 1000;

  if (
    user.otpLastSentAt &&
    Date.now() - user.otpLastSentAt.getTime() < cooldown
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
  const cooldown = 2 * 60 * 1000;

  if (
    user.passwordResetOTPLastSentAt &&
    Date.now() - user.passwordResetOTPLastSentAt.getTime() < cooldown
  ) {
    throw new ApiError(
      429,
      "Please wait 2 minutes before requesting a new OTP."
    );
  }

  // with this
  const otp = await user.generatePasswordResetOTP();
  await user.save();

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

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+passwordResetOTP +passwordResetOTPExpiry +passwordResetOTPUsed"
  );

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
  const resetSessionUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      passwordResetOTPUsed: false,
    },
    {
      $set: {
        passwordResetOTPUsed: true,
      },
      $unset: {
        passwordResetOTP: "",
        passwordResetOTPExpiry: "",
      },
      $inc: {
        passwordResetVersion: 1,
      },
    },
    { new: true }
  ).select("+passwordResetVersion");

  if (!resetSessionUser) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  /*
   * Incrementing the version as part of the OTP transition invalidates every
   * previously issued reset token before the new token is returned.
   */
  const resetToken = createPasswordResetToken({
    userId: user._id,
    resetVersion: resetSessionUser.passwordResetVersion,
    secret: process.env.JWT_SECRET,
  });

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

  let decoded;
  try {
    decoded = verifyPasswordResetToken(resetToken, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(400, "Reset session expired. Please start again.");
  }

  if (
    decoded.purpose !== "password_reset" ||
    typeof decoded.userId !== "string" ||
    !Number.isInteger(decoded.resetVersion)
  ) {
    throw new ApiError(400, "Invalid reset token");
  }

  const user = await consumePasswordResetSession({
    User,
    userId: decoded.userId,
    resetVersion: decoded.resetVersion,
    newPassword,
  });

  if (!user) {
    throw new ApiError(400, "Reset session expired. Please start again.");
  }
  await revokeRefreshSessions(user._id);

  emailService
    .sendPasswordResetConfirmation(user.email, user.name)
    .catch((err) => console.error("Confirmation email error:", err));

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password reset successfully. Please log in.")
    );
});

export const completeProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const {
    enrollmentNumber,
    phoneNumber,
    course,
    branch,
    year,
    semester,
    section,
    block,
  } = req.body;
  // find user
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // only student can complete profile
  if (user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(403, "Only students can complete profile");
  }

  // check email verified
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify email first");
  }

  // validate required fields
  if (
    !enrollmentNumber ||
    !phoneNumber ||
    !course ||
    !branch ||
    !year ||
    !semester ||
    !section ||
    !block
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check enrollment already exists
  const existingEnrollment = await User.findOne({
    enrollmentNumber,
    _id: { $ne: userId },
  });

  if (existingEnrollment) {
    throw new ApiError(400, "Enrollment number already exists");
  }

  // check phone already exists
  const existingPhone = await User.findOne({
    phoneNumber,
    _id: { $ne: userId },
  });

  if (existingPhone) {
    throw new ApiError(400, "Phone number already exists");
  }

  // update profile
  user.enrollmentNumber = enrollmentNumber;
  user.phoneNumber = phoneNumber;
  user.course = course;
  user.branch = branch;
  user.year = year;
  user.semester = semester;
  user.section = section;
  user.block = block;

  user.profileCompleted = true;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile completed successfully"));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated. Please contact support.");
  }

  // Email verification only for students
if (user.role === USER_ROLES.STUDENT && !user.isEmailVerified) {

  const cooldown = 2 * 60 * 1000;

  if (
    !user.otpLastSentAt ||
    Date.now() - user.otpLastSentAt.getTime() >= cooldown
  ) {
    const otp = await user.generateEmailVerificationOTP();

    await user.save();

    emailService
      .sendOTPVerification(user.email, user.name, otp)
      .catch((err) => console.error("Email sending failed:", err));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: user.email,
        name: user.name,
        role: user.role,
      },
      "ACCOUNT_NOT_VERIFIED"
    )
  );
}

  const lastLoginDate = new Date();

  User.findByIdAndUpdate(user._id, {
    $set: { lastLogin: lastLoginDate },
  }).catch((err) => console.error("Last login update failed:", err));

  const { token } = await issueSession(user, res);

  let userData = {};

  // Student Response
  if (user.role === USER_ROLES.STUDENT) {
    userData = {
      id: user._id,

      name: user.name,

      email: user.email,

      role: user.role,

      profileImage: user.profileImage,

      profileCompleted: user.profileCompleted,

      enrollmentNumber: user.enrollmentNumber,

      course: user.course,

      branch: user.branch,

      year: user.year,

      semester: user.semester,

      section: user.section,

      block: user.block,

      phoneNumber: user.phoneNumber,

      lastLogin: lastLoginDate,

      createdAt: user.createdAt,
    };
  }

  // Admin Response
  else if (user.role === USER_ROLES.ADMIN) {
    userData = {
      id: user._id,

      name: user.name,

      email: user.email,

      role: user.role,

      block: user.block,

      profileImage: user.profileImage,

      lastLogin: lastLoginDate,

      createdAt: user.createdAt,
    };
  }

  // Director, security, and super admin response
  else if (
    user.role === USER_ROLES.DIRECTOR ||
    user.role === USER_ROLES.SECURITY ||
    user.role === USER_ROLES.SUPER_ADMIN
  ) {
    userData = {
      id: user._id,

      name: user.name,

      email: user.email,

      role: user.role,

      profileImage: user.profileImage,

      lastLogin: lastLoginDate,

      createdAt: user.createdAt,
    };
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        user: userData,
      },
      "Login successful"
    )
  );
});
