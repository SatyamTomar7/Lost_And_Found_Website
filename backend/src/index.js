import process from "../config/env.js";
import connectDB from "./db/connection.js";
import app from "./app.js";
const port = process.env.PORT ||3000;
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("error", error);
      throw error;
    });
    app.listen(port, () => {
      console.log(`🔃 Server is running at port : ${port}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
