import mongoose from "mongoose";
import logger from "../utils/logger.js";

let isDraining = false;

export const setDraining = (value) => {
  isDraining = value;
};

export const getLiveness = (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
};

export const getLegacyHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Lost and Found API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};

export const getReadiness = (req, res) => {
  const connectionState = mongoose.connection.readyState;
  const isDatabaseConnected = connectionState === 1;

  if (isDraining || !isDatabaseConnected) {
    logger.warn(
      {
        requestId: req.requestId,
        check: "readiness",
        dependency: "mongodb",
        connectionState,
        draining: isDraining,
      },
      "Readiness check failed"
    );

    return res.status(503).json({
      success: false,
      status: "not_ready",
    });
  }

  return res.status(200).json({
    success: true,
    status: "ready",
  });
};
