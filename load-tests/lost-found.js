import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const baseUrl = (__ENV.BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const users = Number.parseInt(__ENV.VUS || "10", 10);
const duration = __ENV.DURATION || "30s";
const allowRemote = __ENV.LOADTEST_ALLOW_REMOTE === "true";

if (!allowRemote && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) {
  throw new Error(
    "Load tests default to local hosts. Set LOADTEST_ALLOW_REMOTE=true only for an explicitly controlled test environment."
  );
}

export const options = {
  scenarios: {
    authenticated_reads: {
      executor: "constant-vus",
      vus: users,
      duration,
      exec: "authenticatedReads",
    },
  },
  thresholds: {
    checks: ["rate>0.9"],
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<5000"],
  },
};

const statusFailures = new Counter("status_failures");
const rateLimitResponses = new Counter("rate_limit_responses");
const operationErrors = new Rate("operation_error_rate");
const operationLatency = new Trend("operation_latency", true);

const recordResponse = (response, operation, expectedStatuses = [200]) => {
  operationLatency.add(response.timings.duration, { operation });
  if (response.status === 429) rateLimitResponses.add(1, { operation });
  if (!expectedStatuses.includes(response.status)) {
    statusFailures.add(1, {
      operation,
      status: String(response.status),
    });
    operationErrors.add(1, { operation });
  } else {
    operationErrors.add(0, { operation });
  }
  return check(response, {
    [`${operation} returns an expected status`]: (res) =>
      expectedStatuses.includes(res.status),
  });
};

export function setup() {
  const email = __ENV.TEST_EMAIL;
  const password = __ENV.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "TEST_EMAIL and TEST_PASSWORD are required. Use a dedicated test account."
    );
  }

  const response = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" }, tags: { operation: "login" } }
  );
  recordResponse(response, "login");

  if (response.status !== 200) {
    throw new Error(`Test-account login failed with HTTP ${response.status}`);
  }

  const token = response.json("data.token");
  if (!token) throw new Error("Login response did not contain an access token");
  return { token };
}

export function authenticatedReads({ token }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const responses = http.batch([
    {
      method: "GET",
      url: `${baseUrl}/api/health`,
      params: { tags: { operation: "health" } },
    },
    {
      method: "GET",
      url: `${baseUrl}/api/auth/me`,
      params: { headers, tags: { operation: "auth_me" } },
    },
    {
      method: "GET",
      url: `${baseUrl}/api/lostitems/my?page=1&limit=10`,
      params: { headers, tags: { operation: "lost_items_page" } },
    },
    {
      method: "GET",
      url: `${baseUrl}/api/notifications?page=1&limit=10`,
      params: { headers, tags: { operation: "notifications_page" } },
    },
    {
      method: "GET",
      url: `${baseUrl}/api/notifications/stats`,
      params: { headers, tags: { operation: "notification_stats" } },
    },
  ]);

  const operations = [
    "health",
    "auth_me",
    "lost_items_page",
    "notifications_page",
    "notification_stats",
  ];
  responses.forEach((response, index) =>
    recordResponse(response, operations[index])
  );

  sleep(1);
}
