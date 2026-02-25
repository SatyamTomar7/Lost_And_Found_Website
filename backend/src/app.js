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
import matchRoutes from "./routes/matches.routes.js"
import notificationRoutes from "./routes/notification.routes.js"
import uploadRoutes from "./routes/upload.routes.js"

const app = express();
const httpServer = createServer(app);

// 1. SOCKET.IO SETUP
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Updated to default Vite port
    methods: ["GET", "POST"],
    credentials: true,
  },
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

// 3. HELMET - Updated CSP to allow your Backend and Sockets
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        scriptSrc: ["'self'"],
        // This 'connectSrc' fix is critical for CORS/Socket.io to work with Helmet
        connectSrc: [
          "'self'", 
          "http://localhost:5000", 
          "ws://localhost:5000", 
          "http://localhost:5173"
        ],
      },
    },
  })
);

// 4. RATE LIMITER
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// 5. BODY PARSERS
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

// 6. ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/lostitems", lostItemRoutes);
app.use("/api/founditems", foundItemRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);

// Fixed: Added (req, res) parameters
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Lost and Found API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 7. ERROR HANDLING (Always last)
app.use(errorHandler);

export default httpServer; // Changed to export httpServer for socket support