import express from "express";
import cors from "cors";
import helmet from "helmet";
import {rateLimit} from "express-rate-limit";
import {errorHandler} from "./middlewares/errorHandler.middlewares.js"
const app = express();

import authRoutes from "./routes/user.routes.js"

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/",limiter)
// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  // origin: "http://localhost:5501",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);
app.use(express.static("public"));

app.use("/api/auth", authRoutes);





app.get("/api/health",()=>{
  res.status(200).json({
    success:true,
    message:"Lost and Found API is running",
    timestamp:new Date().toISOString(),
    uptime:process.uptime()
  })
})
// Error handling middleware
app.use(errorHandler);

export default app;
