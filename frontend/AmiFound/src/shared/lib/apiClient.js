// shared/lib/apiClient.js

export const DEFAULT_TIMEOUT = 10000; // 10 seconds — standard API calls
export const UPLOAD_TIMEOUT = 30000; // 30 seconds — file uploads on slow connections

let authHandlers = {
  getToken: () => null,
  refresh: null,
  onFailure: null,
};

export const configureAuthHandlers = (handlers) => {
  authHandlers = { ...authHandlers, ...handlers };
};

/**
 * Core fetch helper shared across all service files.
 *
 * Handles:
 *  - Request timeout via AbortController
 *  - HTTP error responses (4xx / 5xx) → throws Error with server's message
 *  - Network failures (offline, DNS) → re-throws original fetch error
 *  - Timeout → throws Error with status 408
 *  - Success (2xx) → returns parsed JSON
 *
 * Usage:
 *   import { apiFetch } from "./apiClient";
 *   const data = await apiFetch(url, { method: "POST", headers, body });
 *
 * Custom timeout (e.g. file upload):
 *   import { apiFetch, UPLOAD_TIMEOUT } from "./apiClient";
 *   const data = await apiFetch(url, options, UPLOAD_TIMEOUT);
 */
export const apiFetch = async (
  url,
  options = {},
  timeout = DEFAULT_TIMEOUT,
  hasRetried = false,
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: options.credentials || "include",
      signal: controller.signal,
    });

    if (!response.ok) {
      if (
        response.status === 401 &&
        !hasRetried &&
        authHandlers.refresh &&
        !options.skipAuthRefresh &&
        options.headers?.Authorization
      ) {
        const token = await authHandlers.refresh();
        return apiFetch(
          url,
          {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${token}`,
            },
          },
          timeout,
          true,
        );
      }
      const contentType = response.headers.get("content-type");

      let body = {};

      if (contentType?.includes("application/json")) {
        body = await response.json().catch(() => ({}));
      } else {
        body = await response.text().catch(() => "");
      }
      const errorMessage =
        typeof body === "string"
          ? body
          : body.message || `Request failed: ${response.status}`;

      const error = new Error(errorMessage);

      error.status = response.status;

      // preserve backend validation details
      if (typeof body === "object" && body !== null) {
        error.errors = body.errors;
        error.response = body;
      }

      throw error;
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return response.json();
    }

    return null;
  } catch (err) {
    if (err.name === "AbortError") {
      const error = new Error("Request timed out. Please try again.");
      error.status = 408;
      throw error;
    }
    throw err;
  } finally {
    // Always clear the timer — prevents memory leaks if request
    // completes (success or error) before the timeout fires
    clearTimeout(timer);
  }
};
