import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";
import {
  getRoot,
  getLegacyHealth,
  getLiveness,
  getReadiness,
  setDraining,
} from "./health.service.js";

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test.afterEach(() => {
  setDraining(false);
});

test("root response is safe and confirms the API is running", () => {
  const response = createResponse();

  getRoot({}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    success: true,
    message: "Lost and Found API is running",
  });
});

test("liveness is independent of MongoDB state and returns a minimal response", () => {
  const originalReadyState = mongoose.connection.readyState;
  const response = createResponse();
  mongoose.connection.readyState = 0;

  getLiveness({}, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { success: true, status: "ok" });
  mongoose.connection.readyState = originalReadyState;
});

test("legacy health response remains compatible", () => {
  const response = createResponse();

  getLegacyHealth({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "Lost and Found API is running");
  assert.equal(typeof response.body.timestamp, "string");
  assert.equal(typeof response.body.uptime, "number");
});

test("readiness returns ready when MongoDB is connected", () => {
  const originalReadyState = mongoose.connection.readyState;
  const response = createResponse();
  mongoose.connection.readyState = 1;

  getReadiness({ requestId: "health-test" }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { success: true, status: "ready" });
  mongoose.connection.readyState = originalReadyState;
});

test("readiness returns 503 without exposing database details when disconnected", () => {
  const originalReadyState = mongoose.connection.readyState;
  const response = createResponse();
  mongoose.connection.readyState = 0;

  getReadiness({ requestId: "health-test" }, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    success: false,
    status: "not_ready",
  });
  assert.equal(JSON.stringify(response.body).includes("Mongo"), false);
  mongoose.connection.readyState = originalReadyState;
});

test("readiness returns 503 while the application is draining", () => {
  const originalReadyState = mongoose.connection.readyState;
  const response = createResponse();
  mongoose.connection.readyState = 1;
  setDraining(true);

  getReadiness({ requestId: "health-test" }, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    success: false,
    status: "not_ready",
  });
  mongoose.connection.readyState = originalReadyState;
});
