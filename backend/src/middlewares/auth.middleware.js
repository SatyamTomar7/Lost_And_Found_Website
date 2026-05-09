import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { USER_ROLES } from "../constants.js";

export const protect = asyncHandler(async (req, _, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Access denied. No token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(decoded.id).select("-password");

  if (!user) throw new ApiError(401, "User not found");
  if (!user.isActive)
    throw new ApiError(403, "Account deactivated. Please contact support.");
  if (!user.isEmailVerified)
    throw new ApiError(403, "Email not verified. Please verify your email.");
  if (user.passwordChangedAt) {
    const changedAt = parseInt(user.passwordChangedAt.getTime() / 1000);
    if (decoded.iat < changedAt) {
      throw new ApiError(
        401,
        "Password was recently changed. Please log in again."
      );
    }
  }

  req.user = user;
  next();
});

export const authorize = (...roles) => {
  return (req, _, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role: ${roles.join(" or ")}`
      );
    }

    next();
  };
};

export const isStudent = authorize(USER_ROLES.STUDENT);
export const isAdmin = authorize(USER_ROLES.ADMIN);
export const isManagement = authorize(USER_ROLES.SECURITY,USER_ROLES.DIRECTOR);
export const optionalAuth = asyncHandler(async (req, _, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (user && user.isActive && user.isEmailVerified) {
        if (user.passwordChangedAt) {
          const changedAt = parseInt(user.passwordChangedAt.getTime() / 1000);
          if (decoded.iat < changedAt) {
            return next();
          }
        }
        req.user = user;
      }
    } catch (error) {
      console.warn("Optional Auth: Invalid token ignored");
    }
  }

  next();
});
