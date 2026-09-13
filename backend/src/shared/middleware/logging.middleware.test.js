import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../utils/ApiError.js";
import { createErrorHandler } from "./errorHandler.middleware.js";
import { requestIdMiddleware } from "./requestId.middleware.js";
import { createRequestLoggerMiddleware } from "./requestLogger.middleware.js";

const createResponse = () => {
  const response = {
    statusCode: 200,
    headers: {},
    body: null,
    listeners: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    on(event, callback) {
      this.listeners[event] = callback;
    },
    finish() {
      this.listeners.finish?.();
    },
  };
  return response;
};

const createRequest = (requestId = "request-id") => ({
  requestId,
  method: "POST",
  path: "/api/test",
  originalUrl: "/api/test",
  ip: "127.0.0.1",
  get: (name) => (name === "user-agent" ? "test-agent" : undefined),
});

test("request IDs are unique and returned in the response header", () => {
  const firstRequest = {};
  const firstResponse = createResponse();
  const secondRequest = {};
  const secondResponse = createResponse();

  requestIdMiddleware(firstRequest, firstResponse, () => {});
  requestIdMiddleware(secondRequest, secondResponse, () => {});

  assert.match(firstRequest.requestId, /^[0-9a-f-]{36}$/);
  assert.notEqual(firstRequest.requestId, secondRequest.requestId);
  assert.equal(firstResponse.headers["X-Request-ID"], firstRequest.requestId);
  assert.equal(secondResponse.headers["X-Request-ID"], secondRequest.requestId);
});

test("production unexpected errors are sanitized and logged with context", () => {
  const logs = [];
  const handler = createErrorHandler({
    error(fields, message) {
      logs.push({ fields, message });
    },
  });
  const request = createRequest("request-123");
  const response = createResponse();
  const error = new Error("Mongo connection string and secret");
  error.stack = "Sensitive stack trace";

  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    handler(error, request, response, () => {});
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.message, "Internal server error");
  assert.equal(response.body.requestId, "request-123");
  assert.equal(response.body.errors.length, 0);
  assert.equal(response.body.stack, undefined);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].fields.requestId, "request-123");
  assert.equal(logs[0].fields.error.message, error.message);
  assert.equal(logs[0].fields.error.stack, error.stack);
});

test("safe application errors preserve their public response", () => {
  const logs = [];
  const handler = createErrorHandler({
    error(fields) {
      logs.push(fields);
    },
  });
  const response = createResponse();

  handler(
    new ApiError(403, "Access denied"),
    createRequest("request-456"),
    response,
    () => {}
  );

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.message, "Access denied");
  assert.equal(response.body.requestId, "request-456");
  assert.deepEqual(response.body.errors, []);
  assert.equal(logs.length, 0);
});

test("completed requests are logged without sensitive request data", () => {
  const logs = [];
  const middleware = createRequestLoggerMiddleware({
    info(fields) {
      logs.push(fields);
    },
    warn() {},
    error() {},
  });
  const request = createRequest("request-789");
  request.body = { password: "secret", resetToken: "jwt-secret" };
  const response = createResponse();

  middleware(request, response, () => {});
  response.statusCode = 200;
  response.finish();

  assert.equal(logs.length, 1);
  assert.equal(logs[0].requestId, "request-789");
  assert.equal(logs[0].statusCode, 200);
  assert.equal(logs[0].method, "POST");
  assert.equal("body" in logs[0], false);
  assert.equal("password" in logs[0], false);
  assert.equal("resetToken" in logs[0], false);
});
