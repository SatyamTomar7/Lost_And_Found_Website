import mongoose from "mongoose";
import { DB_NAME } from "../../config/constants.js";

export const getMongoConnectionUri = (uri, databaseName = DB_NAME) => {
  const parsed = new URL(uri);

  if (!parsed.pathname || parsed.pathname === "/") {
    parsed.pathname = `/${databaseName}`;
  }

  return parsed.toString();
};

const connectDB = async () => {
  try {
    if (process.env.NODE_ENV === "development") {
      mongoose.set("debug", true);
    }
    const connectionInstance = await mongoose.connect(
      getMongoConnectionUri(process.env.MONGODB_URI)
    );
    console.log(
      `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("MONGODB connection error ", error);
    process.exit(1);
  }
};
export default connectDB;
