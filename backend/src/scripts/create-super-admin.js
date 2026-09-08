import "../config/env.js";
import mongoose from "mongoose";
import connectDB from "../shared/db/connection.js";
import { USER_ROLES } from "../config/constants.js";
import { User } from "../modules/auth/User.model.js";

const { SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } =
  process.env;

if (!SUPER_ADMIN_NAME || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  console.error(
    "Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD before running this command."
  );
  process.exit(1);
}

try {
  await connectDB();

  const email = SUPER_ADMIN_EMAIL.toLowerCase();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.error(
      "A user already exists with SUPER_ADMIN_EMAIL. No account was changed."
    );
    process.exitCode = 1;
  } else {
    await User.create({
      name: SUPER_ADMIN_NAME,
      email,
      password: SUPER_ADMIN_PASSWORD,
      role: USER_ROLES.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    console.log("Super admin account created.");
  }
} finally {
  await mongoose.connection.close();
}
