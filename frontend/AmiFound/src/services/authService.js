import { apiFetch } from "./apiClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ==================== HELPER FUNCTIONS ====================

export const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

export const isValidAmityEmail = (email) =>
  email.endsWith("@s.amity.edu") || email.endsWith("@gwa.amity.edu");

export const isAuthenticated = () => !!localStorage.getItem("authToken");

export const clearAuth = () => localStorage.removeItem("authToken");

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
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    return data;
  } catch (err) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    throw err;
  }
};

export const checkCurrentUser = async () => {
  const token = localStorage.getItem("authToken");

  if (!token) {
    return {
      success: false,
      shouldLogout: true,
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
      localStorage.removeItem("authToken");
      localStorage.removeItem("userRole");

      return {
        success: false,
        shouldLogout: true,
        user: null,
      };
    }

    // Other server errors
    if (!response.ok) {
      return {
        success: false,
        shouldLogout: false,
        user: null,
      };
    }

    const result = await response.json();

    return {
      success: true,
      shouldLogout: false,
      user: result.data || null,
    };
  } catch (error) {
    // Network error / timeout
    console.error("Session recovery failed:", error);

    return {
      success: false,
      shouldLogout: false,
      user: null,
    };
  } finally {
    clearTimeout(timer);
  }
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
