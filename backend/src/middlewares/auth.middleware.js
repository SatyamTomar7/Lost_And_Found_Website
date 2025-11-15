import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
export const protect = asyncHandler(async (req,res,next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    throw new ApiError(401, "Access denied . No token provided");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, "User not found");
  }
  if (!user.isActive) {
    throw new ApiError(401, "Account deactivated");
  }
  if (!user.isEmailVerified) {
    throw new ApiError(401, "Email not verified");
  }
  req.user = user;
  next();
});
