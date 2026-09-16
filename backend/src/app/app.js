import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import { errorHandler } from "../shared/middleware/errorHandler.middleware.js";
import { socketHandler } from "./socket.js";
import { registerRoutes } from "./routes.js";
import process from "../config/env.js";
import { requestIdMiddleware } from "../shared/middleware/requestId.middleware.js";
import { requestLoggerMiddleware } from "../shared/middleware/requestLogger.middleware.js";

const app = express();

// Render places one trusted reverse proxy in front of the application.
// Trusting exactly one hop prevents client-supplied forwarded IPs from
// bypassing rate limits while allowing Express to determine the real client IP.
const trustProxy =
  process.env.NODE_ENV === "production"
    ? 1
    : process.env.TRUST_PROXY === "true"
      ? true
      : process.env.TRUST_PROXY === "false" || !process.env.TRUST_PROXY
        ? false
        : /^\d+$/.test(process.env.TRUST_PROXY)
          ? Number(process.env.TRUST_PROXY)
          : false;
app.set("trust proxy", trustProxy);

const allowedOrigin = process.env.CLIENT_URL;
const originValidator = (origin, callback) => {
  if (!origin || origin === allowedOrigin) {
    return callback(null, true);
  }
  return callback(new Error("Origin is not allowed"));
};
const httpServer = createServer(app);

app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// 1. SOCKET.IO SETUP
const io = new Server(httpServer, {
  cors: {
    origin: originValidator,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});
socketHandler(io);
app.set("socketio", io);

// 2. CORS - MUST BE FIRST (to handle Preflight and Limiter errors)
app.use(
  cors({
    origin: originValidator,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 3. HELMET - CSP is environment-aware to avoid exposing dev ports in production
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],

        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          ...(process.env.NODE_ENV === "development"
            ? [
                "http://localhost:5000",
                "ws://localhost:5000",
                "http://localhost:4173",
              ]
            : [
                process.env.CLIENT_URL,
                `wss://${process.env.CLIENT_URL?.replace("https://", "")}`,
              ]),
        ],
      },
    },
  })
);

// 5. BODY PARSERS
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
registerRoutes(app);

// 7. 404 HANDLER - Must be after all routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// 8. ERROR HANDLING - Always last
app.use(errorHandler);

export { io };
export default httpServer;
