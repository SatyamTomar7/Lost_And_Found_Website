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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) throw new ApiError(401, "User not found");
    if (!user.isActive) throw new ApiError(401, "Account deactivated");
    if (!user.isEmailVerified) throw new ApiError(401, "Email not verified");

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
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
        req.user = user;
      }
    } catch (error) {
      console.log("Optional Auth: Invalid token ignored");
    }
  }

  next();
});
