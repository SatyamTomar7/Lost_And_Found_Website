import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { FILE_UPLOAD } from "../../config/constants.js";

const parseLimit = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

export const UPLOAD_RATE_LIMIT_CONFIG = {
  perUser: {
    windowMs:
      parseLimit("UPLOAD_RATE_LIMIT_USER_WINDOW", 60 * 60 * 1000),
    max: parseLimit("UPLOAD_RATE_LIMIT_PER_USER", 20),
  },
  perIp: {
    windowMs:
      parseLimit("UPLOAD_RATE_LIMIT_IP_WINDOW", 10 * 60 * 1000),
    max: parseLimit("UPLOAD_RATE_LIMIT_PER_IP", 5),
  },
};

const rateLimitResponse = {
  success: false,
  message: "Too many upload requests. Please try again later.",
};

export const uploadUserLimiter = rateLimit({
  ...UPLOAD_RATE_LIMIT_CONFIG.perUser,
  keyGenerator: (req) => `user:${req.user._id.toString()}`,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  // Process-local by default. Replace with a shared store for multi-instance deployments.
});

export const uploadIpLimiter = rateLimit({
  ...UPLOAD_RATE_LIMIT_CONFIG.perIp,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  // Process-local by default. Replace with a shared store for multi-instance deployments.
});

export const uploadLimitConfig = {
  ...UPLOAD_RATE_LIMIT_CONFIG,
  maxFileSize: FILE_UPLOAD.MAX_SIZE,
};
