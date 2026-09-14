import assert from "node:assert/strict";
import test from "node:test";
import { validateEnvironment } from "./env.js";

const productionEnvironment = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb://localhost:27017/lost_and_found",
  JWT_SECRET: "secret",
  CLIENT_URL: "https://lost.example.edu",
  JWT_EXPIRE: "15m",
  CLIENT_ID: "client-id",
  CLIENT_SECRET: "client-secret",
  REFRESH_TOKEN: "refresh-token",
  MY_EMAIL: "noreply@example.edu",
  CLOUDINARY_CLOUD_NAME: "cloud",
  CLOUDINARY_API_KEY: "key",
  CLOUDINARY_API_SECRET: "secret",
};

test("production environment validation requires all provider credentials", () => {
  const invalid = { ...productionEnvironment };
  delete invalid.CLOUDINARY_API_SECRET;

  assert.throws(() => validateEnvironment(invalid), /CLOUDINARY_API_SECRET/);
});

test("production environment rejects wildcard and malformed origins", () => {
  assert.throws(
    () => validateEnvironment({ ...productionEnvironment, CLIENT_URL: "*" }),
    /CLIENT_URL/
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...productionEnvironment,
        CLIENT_URL: "https://user:pass@example.edu",
      }),
    /CLIENT_URL/
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...productionEnvironment,
        CLIENT_URL: "http://lost.example.edu",
      }),
    /CLIENT_URL/
  );
});

test("development and test environments may omit production-only credentials", () => {
  assert.equal(
    validateEnvironment({
      NODE_ENV: "test",
      CLIENT_URL: "http://localhost:5173",
      JWT_EXPIRE: "15m",
    }),
    true
  );
});
