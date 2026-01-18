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
  if (existingUser) {
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

  const user = await User.findOne({email }).select(
    "+emailVerificationOTP +emailVerificationExpire"
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isEmailVerified) {
    throw new ApiError(400, "Email already verified");
  }
  if (!user.verifyEmailOTP(otp)) {
    throw new ApiError(400, "Invalid or expired OTP");
  }
  user.isEmailVerified = true;
  user.emailVerificationOTP = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  const token = user.getJWTToken();
  return res.status(200).json(
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
  const { email, password } = req.body ;
  const user = await User.findOne({ email}).select(
    "+password"
  );
  if (!user) throw new ApiError(401, "Invalid email or password");

  const valid = await user.isPasswordCorrect(password);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated. Please contact support.");
  }
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }
  user.lastLogin = new Date();
  await user.save();
  user.password = undefined;
  const token = user.getJWTToken();
  return res.status(200).json(
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
          lastLogin: user.lastLogin,
        },
      },
      "login successful"
    )
  );
});
export const adminLogin = asyncHandler(async (req, res) => {
  const { username, password, department } = req.body;
  const email = `${username}367@gmail.com`;

  const user = await User.findOne({
    email,
    role: USER_ROLES.ADMIN,
    department,
  }).select("+password");
  if (!user) throw new ApiError(401, "Invalid credentials");

  const valid = await user.isPasswordCorrect(password);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }
  if (!user.isActive) {
    throw new ApiError(403, "Admin account is deactivated");
  }
  user.lastLogin = new Date();
  await user.save();
  user.password = undefined;
  const token = user.getJWTToken();
  return res.status(200).json(
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
          lastLogin: user.lastLogin,
        },
      },
      "Admin login successful"
    )
  );
});
export const getMe = asyncHandler(async (req, res) => {
  // const user = await User.findById(req.user._id);
  if (!req.user) throw new ApiError(404, "User not found");
  return res.status(200).json(
    new ApiResponse(
      200,
      req.user,
      {
        // id: req.user._id,
        // name: req.user.name,
        // role: req.user.role,
        // department: req.user.department,
        // profileImage: req.user.profileImage,
        // isEmailVerified: req.user.isEmailVerified,
        // isActive: req.user.isActive,
        // lastLogin: req.user.lastLogin,
        // createdAt: req.user.createdAt,
      },
      "User details fetched successfully"
    )
  );
});
export const logout = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

export const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email});

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.isEmailVerified) {
    throw new ApiError(400, "Email already verified");
  }
  const otp = user.generateEmailVerificationOTP();
  await user.save();

  let emailSent = false;

  try {
    emailSent = await emailService.sendOTPVerification(email, user.name, otp);
  } catch (error) {
    console.error("Email sending failed", error);
  }
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: user.email,
        otpSent: !!emailSent,
      },
      emailSent
        ? "OTP sent successfully"
        : "Failed to send OTP email. Try again later"
    )
  );
});
