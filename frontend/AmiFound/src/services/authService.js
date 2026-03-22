const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ==================== CORE FETCH HELPER ====================

/**
 * Wraps fetch with consistent HTTP error handling.
 * - Network failures (offline, DNS) → throws the original fetch error
 * - HTTP error responses (4xx, 5xx) → throws Error with server's message
 * - Success (2xx) → returns parsed JSON
 *
 * All callers can now rely on throw = something went wrong,
 * so TanStack Query's onError fires correctly for both network
 * and server errors — not just network failures.
 */
const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get authentication headers with JWT token
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

/**
 * Validate if email is a valid Amity email
 */
export const isValidAmityEmail = (email) => {
  return email.endsWith("@s.amity.edu");
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("authToken");
  return !!token;
};

/**
 * Clear all authentication data
 */
export const clearAuth = () => {
  localStorage.removeItem("authToken");
};

// ==================== API CALLS ====================

/**
 * Register a new student
 */
export const register = async (name, email, password) => {
  return apiFetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
};

/**
 * Verify OTP for email verification
 * Token storage is handled by the caller (StudentAuthPage)
 */
export const verifyOTP = async (email, otp) => {
  return apiFetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
};

/**
 * Resend OTP to user's email
 */
export const resendOTP = async (email) => {
  return apiFetch(`${API_URL}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
};

/**
 * Login student user
 * Token storage is handled by the caller (StudentAuthPage)
 *
 * NOTE: This endpoint intentionally does NOT use apiFetch for the ok-check
 * because the backend returns a non-2xx-looking success for ACCOUNT_NOT_VERIFIED
 * (it sends 200 with a special message field). We still use apiFetch but the
 * caller's onSuccess handles that special case via result.message check.
 * apiFetch only throws on actual HTTP errors (4xx/5xx with !response.ok).
 */
export const login = async (email, password) => {
  return apiFetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
};

/**
 * Login admin user
 * Token storage is handled by the caller (AdminAuthPage)
 */
export const adminLogin = async (department, username, password) => {
  return apiFetch(`${API_URL}/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ department, username, password }),
  });
};

/**
 * Logout current user
 */
export const logout = async () => {
  // Logout is best-effort — we clear the token regardless of server response.
  // apiFetch not used here intentionally: even a 401/500 should result in
  // local logout. Caller (App.jsx) handles the .catch() path already.
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    localStorage.removeItem("authToken");
    return data;
  } catch (error) {
    localStorage.removeItem("authToken");
    throw error;
  }
};

/**
 * Check current user authentication status
 * Returns user object or null — never throws, so App.jsx session
 * rehydration always completes cleanly.
 */
export const checkCurrentUser = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });

    if (response.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");
      return null;
    }

    if (!response.ok) return null;

    const result = await response.json();
    return result.data || null;
  } catch {
    // Network failure during session check → treat as logged out
    return null;
  }
};

// ==================== STUDENT PASSWORD RESET ====================

// Step 1: Request OTP
export const forgotPassword = async (email) => {
  return apiFetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
};

// Step 2: Verify OTP → returns resetToken
export const verifyResetOTP = async (email, otp) => {
  return apiFetch(`${API_URL}/auth/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
};

// Step 3: Set new password using resetToken
export const resetPassword = async (resetToken, newPassword, confirmPassword) => {
  return apiFetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  });
};

// ==================== ADMIN PASSWORD RESET ====================

// Step 1: Request OTP
export const adminForgotPassword = async (email) => {
  return apiFetch(`${API_URL}/auth/admin/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
};

// Step 2: Verify OTP → returns resetToken
export const adminVerifyResetOTP = async (email, otp) => {
  return apiFetch(`${API_URL}/auth/admin/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
};

// Step 3: Set new password using resetToken
export const adminResetPassword = async (resetToken, newPassword, confirmPassword) => {
  return apiFetch(`${API_URL}/auth/admin/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  });
};