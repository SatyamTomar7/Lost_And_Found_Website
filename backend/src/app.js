import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { errorHandler } from "./middlewares/errorHandler.middlewares.js";
import { socketHandler } from "./utils/socketHandler.js";
import { createServer } from "http";
import { Server } from "socket.io";

// Routes
import authRoutes from "./routes/auth.routes.js";
import lostItemRoutes from "./routes/lostitem.routes.js";
import foundItemRoutes from "./routes/founditem.routes.js";
import matchRoutes from "./routes/matches.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

const app = express();
const httpServer = createServer(app);

// 1. SOCKET.IO SETUP
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ,
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
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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
                "http://localhost:5173",
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // strict for auth endpoints
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // relaxed for regular API usage
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api/auth", authLimiter, authRoutes);  
app.use("/api/lostitems", apiLimiter, lostItemRoutes);
app.use("/api/founditems", apiLimiter, foundItemRoutes);
app.use("/api/matches", apiLimiter, matchRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Lost and Found API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 7. 404 HANDLER - Must be after all routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// 8. ERROR HANDLING - Always last
app.use(errorHandler);

export default httpServer;
