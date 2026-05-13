import "../config/env.js";
import mongoose from "mongoose";

import connectDB from "./db/connection.js";
import httpServer, { io } from "./app.js";

import {
  startTransferOldItemsJob,
  stopTransferOldItemsJob,
} from "./jobs/transferOldItems.job.js";

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

  console.log(
    `\n[Server] ${signal} received — shutting down gracefully`
  );

  try {
    // Stop cron jobs
    stopTransferOldItemsJob();

    // Close HTTP server
    await new Promise((resolve, reject) => {
      httpServer.close((err) => {
        if (err) {
          return reject(err);
        }

        console.log("[Server] HTTP server closed");
        resolve();
      });
    });

    // Close MongoDB connection
    await mongoose.connection.close();

    console.log("[Server] MongoDB connection closed");

    process.exit(0);
  } catch (error) {
    console.error(
      "[Server] Error during graceful shutdown:",
      error
    );

    process.exit(1);
  }
};

// Force shutdown timeout
setTimeout(() => {}, 0).unref();

const forceShutdownTimer = () => {
  setTimeout(() => {
    console.error(
      "[Server] Shutdown timeout — forcing exit"
    );

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
  console.error(
    "[Server] Unhandled promise rejection:",
    reason
  );

  forceShutdownTimer();

  shutdown("unhandledRejection");
});

process.on("uncaughtException", (err) => {
  console.error(
    "[Server] Uncaught exception:",
    err
  );

  forceShutdownTimer();

  shutdown("uncaughtException");
});

// ─────────────────────────────────────────────────────────────
// HTTP Server Errors
// ─────────────────────────────────────────────────────────────
httpServer.on("error", (error) => {
  console.error(
    "[Server] HTTP server error:",
    error
  );

  forceShutdownTimer();

  shutdown("httpServerError");
});

// ─────────────────────────────────────────────────────────────
// Application Boot
// ─────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(
        `✅ Server running on port ${port}`
      );

      // Start scheduled cron jobs
      startTransferOldItemsJob(io);
    });
  })
  .catch((err) => {
    console.error(
      "[Server] MongoDB connection failed:",
      err
    );

    process.exit(1);
  });
