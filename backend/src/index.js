// import process from "../config/env.js";
import "../config/env.js"; // Load environment variables (side-effect only)
import connectDB from "./db/connection.js";
import httpServer from "./app.js";

const port = process.env.PORT || 3000;

// Register error listener before listen
httpServer.on("error", (error) => {
  console.error("Server error:", error);
  throw error;
});

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`🔃 Server is running at port : ${port}`);
    });
  })
  .catch((err) => {
    console.error("MONGO db connection failed !!! ", err);
    process.exit(1);
  });
