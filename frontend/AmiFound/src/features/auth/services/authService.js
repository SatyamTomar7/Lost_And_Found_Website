import { apiFetch } from "../../../shared/lib/apiClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const AUTH_TOKEN_KEY = "authToken";
const USER_ROLE_KEY = "userRole";

// ==================== HELPER FUNCTIONS ====================

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const getStoredUserRole = () => localStorage.getItem(USER_ROLE_KEY);

export const setAuthSession = (token, role) => {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (role) localStorage.setItem(USER_ROLE_KEY, role);
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
};

export const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

export const isValidAmityEmail = (email) =>
  email.endsWith("@s.amity.edu") || email.endsWith("@gwa.amity.edu");

export const isValidStudentRegistrationEmail = (email) =>
  email.endsWith("@s.amity.edu");

export const isAuthenticated = () => !!getAuthToken();

export const clearAuth = clearAuthSession;

// ==================== AUTH ====================

export const register = async (name, email, password) =>
  apiFetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

export const verifyOTP = async (email, otp) =>
  apiFetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

export const resendOTP = async (email) =>
  apiFetch(`${API_URL}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

export const login = async (email, password) =>
  apiFetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

export const logout = async () => {
  // Best-effort — clear token regardless of server response or timeout
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    let data = null;

    try {
      data = await response.json();
    } catch {
      data = { success: true };
    }
    clearAuthSession();
    return data;
  } catch (err) {
    clearAuthSession();
    throw err;
  }
};

export const checkCurrentUser = async () => {
  const token = getAuthToken();

  if (!token) {
    return {
      success: false,
      hasToken: false,
      shouldLogout: true,
      errorType: null,
      user: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    });

    // REAL invalid token
    if (response.status === 401) {
      clearAuthSession();

      return {
        success: false,
        hasToken: true,
        shouldLogout: true,
        errorType: "unauthorized",
        user: null,
      };
    }

    // Other server errors
    if (!response.ok) {
      return {
        success: false,
        hasToken: true,
        shouldLogout: false,
        errorType: "server",
        user: null,
      };
    }

    const result = await response.json();

    return {
      success: true,
      hasToken: true,
      shouldLogout: false,
      errorType: null,
      user: result.data || null,
    };
  } catch (error) {
    // Network error / timeout
    console.error("Session recovery failed:", error);

    return {
      success: false,
      hasToken: true,
      shouldLogout: false,
      errorType: "network",
      user: null,
    };
  } finally {
    clearTimeout(timer);
  }
};

export const fetchCurrentUser = async () => {
  const result = await checkCurrentUser();

  if (!result.success || !result.user) {
    const error = new Error("Failed to fetch current user");
    error.shouldLogout = result.shouldLogout;
    throw error;
  }

  return result.user;
};

export const completeProfile = async (data) =>
  apiFetch(`${API_URL}/auth/complete-profile`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

// ==================== STUDENT PASSWORD RESET ====================

export const forgotPassword = async (email) =>
  apiFetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

export const verifyResetOTP = async (email, otp) =>
  apiFetch(`${API_URL}/auth/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

export const resetPassword = async (resetToken, newPassword, confirmPassword) =>
  apiFetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  });
