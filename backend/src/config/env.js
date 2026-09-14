// ✅ Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const REQUIRED_PRODUCTION_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "CLIENT_URL",
  "JWT_EXPIRE",
  "CLIENT_ID",
  "CLIENT_SECRET",
  "REFRESH_TOKEN",
  "MY_EMAIL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const isValidOrigin = (value, isProduction) => {
  try {
    const url = new URL(value);
    return (
      (isProduction
        ? url.protocol === "https:"
        : ["http:", "https:"].includes(url.protocol)) &&
      !url.username &&
      !url.password &&
      !(
        isProduction && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      ) &&
      !url.pathname.replace(/\/$/, "") &&
      !url.search &&
      !url.hash &&
      value !== "*"
    );
  } catch {
    return false;
  }
};

export const validateEnvironment = (
  environment = process.env,
  { requireProduction = environment.NODE_ENV === "production" } = {}
) => {
  const missing = REQUIRED_PRODUCTION_VARS.filter(
    (name) => requireProduction && !environment[name]?.trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`
    );
  }

  if (
    environment.CLIENT_URL &&
    !isValidOrigin(environment.CLIENT_URL, requireProduction)
  ) {
    throw new Error("CLIENT_URL must be a single, valid non-wildcard origin");
  }

  if (
    environment.JWT_EXPIRE &&
    !/^\d+(s|m|h|d|w|y)$/.test(environment.JWT_EXPIRE)
  ) {
    throw new Error("JWT_EXPIRE must use a duration such as 15m or 1h");
  }

  return true;
};

if (process.env.NODE_ENV === "production") {
  validateEnvironment();
}

export default process;
