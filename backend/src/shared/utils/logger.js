import pino from "pino";
import "../../config/env.js";

const isDevelopment = process.env.NODE_ENV === "development";

const transport = isDevelopment
  ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        singleLine: true,
      },
    }
  : undefined;

const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  transport,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "headers.authorization",
      "headers.cookie",
      "password",
      "passwordResetOTP",
      "emailVerificationOTP",
      "resetToken",
      "refreshToken",
      "token",
    ],
    censor: "[REDACTED]",
  },
});

export default logger;
