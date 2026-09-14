import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "root-route-test-secret";
process.env.JWT_EXPIRE = "15m";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAME_SITE = "lax";
process.env.CLOUDINARY_CLOUD_NAME = "root-route-test";
process.env.CLOUDINARY_API_KEY = "root-route-test";
process.env.CLOUDINARY_API_SECRET = "root-route-test";

const { default: app } = await import("./app.js");

test("GET / returns a safe successful API response", async () => {
  const response = await request(app).get("/");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    message: "Lost and Found API is running",
  });
});

test("HEAD / is handled by the root route", async () => {
  const response = await request(app).head("/");

  assert.equal(response.status, 200);
});
