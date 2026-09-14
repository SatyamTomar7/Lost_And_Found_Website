import { apiFetch, configureAuthHandlers } from "../../../shared/lib/apiClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
let accessToken = null;
let refreshPromise = null;

export const getAuthToken = () => accessToken;
export const getStoredUserRole = () => null;
export const setAuthSession = (token) => {
  accessToken = token || null;
};
export const clearAuthSession = () => {
  accessToken = null;
};
export const getAuthHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
};
export const isAuthenticated = () => !!accessToken;
export const clearAuth = clearAuthSession;

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = apiFetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      skipAuthRefresh: true,
    })
      .then((result) => {
        if (!result?.data?.token) throw new Error("Session refresh failed");
        accessToken = result.data.token;
        return accessToken;
      })
      .catch((error) => {
        clearAuthSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

configureAuthHandlers({
  getToken: getAuthToken,
  refresh: refreshAccessToken,
  onFailure: () => {
    clearAuthSession();
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  },
});

export const isValidAmityEmail = (email) =>
  email.endsWith("@s.amity.edu") || email.endsWith("@gwa.amity.edu");
export const isValidStudentRegistrationEmail = (email) =>
  email.endsWith("@s.amity.edu");

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
  try {
    const data = await apiFetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    clearAuthSession();
    return data;
  } finally {
    clearAuthSession();
  }
};

export const checkCurrentUser = async () => {
  try {
    if (!accessToken) await refreshAccessToken();
    const result = await apiFetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return {
      success: true,
      hasToken: true,
      shouldLogout: false,
      errorType: null,
      user: result.data || null,
    };
  } catch (error) {
    clearAuthSession();
    return {
      success: false,
      hasToken: false,
      shouldLogout: true,
      errorType: error?.status >= 500 ? "server" : "unauthorized",
      user: null,
    };
  }
};

export const fetchCurrentUser = async () => {
  const result = await checkCurrentUser();
  if (!result.success || !result.user)
    throw new Error("Failed to fetch current user");
  return result.user;
};

export const completeProfile = async (data) =>
  apiFetch(`${API_URL}/auth/complete-profile`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
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
