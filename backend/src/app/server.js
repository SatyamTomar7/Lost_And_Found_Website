import "../config/env.js";
import mongoose from "mongoose";

import connectDB from "../shared/db/connection.js";
import httpServer, { io } from "./app.js";

import {
  startTransferOldItemsJob,
  stopTransferOldItemsJob,
} from "../jobs/transferOldItems.job.js";
import { setDraining } from "../shared/health/health.service.js";
import logger from "../shared/utils/logger.js";

const port = process.env.PORT || 3000;

// Prevent multiple shutdown executions
let isShuttingDown = false;

// ─────────────────────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  // Prevent duplicate shutdown calls
  if (isShuttingDown) return;

  isShuttingDown = true;
  setDraining(true);

  logger.info({ signal }, "Graceful shutdown started");

  try {
    // Stop cron jobs
    stopTransferOldItemsJob();

    // Stop accepting new Socket.IO connections before closing HTTP traffic.
    io.close();

    // Close HTTP server
    await new Promise((resolve, reject) => {
      httpServer.close((err) => {
        if (err?.code === "ERR_SERVER_NOT_RUNNING") {
          return resolve();
        }
        if (err) {
          return reject(err);
        }

        logger.info("HTTP server closed");
        resolve();
      });
    });

    // Close MongoDB connection
    await mongoose.connection.close();

    logger.info("MongoDB connection closed");

    process.exit(0);
  } catch (error) {
    logger.error(
      {
        signal,
        error: {
          name: error?.name || "Error",
          message: error?.message || "Unknown shutdown error",
          ...(error?.stack && { stack: error.stack }),
        },
      },
      "Graceful shutdown failed"
    );

    process.exit(1);
  }
};

// Force shutdown timeout
setTimeout(() => {}, 0).unref();

const forceShutdownTimer = () => {
  setTimeout(() => {
    logger.error("Shutdown timeout; forcing exit");

    process.exit(1);
  }, 10_000).unref();
};

// ─────────────────────────────────────────────────────────────
// Process Signals
// ─────────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  forceShutdownTimer();
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  forceShutdownTimer();
  shutdown("SIGINT");
});

// ─────────────────────────────────────────────────────────────
// Unhandled Errors
// ─────────────────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");

  forceShutdownTimer();

  shutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");

  forceShutdownTimer();

  shutdown("uncaughtException");
});

// ─────────────────────────────────────────────────────────────
// HTTP Server Errors
// ─────────────────────────────────────────────────────────────
httpServer.on("error", (error) => {
  logger.error({ err: error }, "HTTP server error");

  forceShutdownTimer();

  shutdown("httpServerError");
});

// ─────────────────────────────────────────────────────────────
// Application Boot
// ─────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      logger.info({ port }, "Server started");

      // Start scheduled cron jobs
      startTransferOldItemsJob(io);
    });
  })
  .catch((err) => {
    logger.error({ err }, "MongoDB connection failed");

    process.exit(1);
  });
