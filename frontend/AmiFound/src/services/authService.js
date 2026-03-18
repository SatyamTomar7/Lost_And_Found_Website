const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ==================== HELPER FUNCTIONS ====================

/**
 * Get authentication headers with JWT token
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Get upload headers (for file uploads)
 */
export const getUploadHeaders = () => {
  const token = localStorage.getItem("authToken");
  const headers = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

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
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return await response.json();
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
};

/**
 * Verify OTP for email verification
 * Token storage is handled by the caller (StudentAuthPage)
 */
export const verifyOTP = async (email, otp) => {
  try {
    const response = await fetch(`${API_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return await response.json();
  } catch (error) {
    console.error("Verify OTP error:", error);
    throw error;
  }
};

/**
 * Resend OTP to user's email
 */
export const resendOTP = async (email) => {
  try {
    const response = await fetch(`${API_URL}/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch (error) {
    console.error("Resend OTP error:", error);
    throw error;
  }
};

/**
 * Login student user
 * Token storage is handled by the caller (StudentAuthPage)
 */
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

/**
 * Login admin user
 * Token storage is handled by the caller (AdminAuthPage)
 */
export const adminLogin = async (department, username, password) => {
  try {
    const response = await fetch(`${API_URL}/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department, username, password }),
    });
    return await response.json();
  } catch (error) {
    console.error("Admin login error:", error);
    throw error;
  }
};

/**
 * Logout current user
 */
export const logout = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    localStorage.removeItem("authToken");
    return data;
  } catch (error) {
    console.error("Logout error:", error);
    localStorage.removeItem("authToken");
    throw error;
  }
};

/**
 * Check current user authentication status
 */
export const checkCurrentUser = async () => {
  const token = localStorage.getItem("authToken");

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("Check current user error:", error);
    localStorage.removeItem("authToken");
    return null;
  }
};

// ==================== STUDENT PASSWORD RESET ====================

// Step 1: Request OTP
export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch (error) {
    console.error("Forgot password error:", error);
    throw error;
  }
};

// Step 2: Verify OTP → returns resetToken
export const verifyResetOTP = async (email, otp) => {
  try {
    const response = await fetch(`${API_URL}/auth/verify-reset-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return await response.json();
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    throw error;
  }
};

// Step 3: Set new password using resetToken
export const resetPassword = async (resetToken, newPassword, confirmPassword) => {
  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
    });
    return await response.json();
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
};

// ==================== ADMIN PASSWORD RESET ====================

// Step 1: Request OTP
export const adminForgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_URL}/auth/admin/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  } catch (error) {
    console.error("Admin forgot password error:", error);
    throw error;
  }
};

// Step 2: Verify OTP → returns resetToken
export const adminVerifyResetOTP = async (email, otp) => {
  try {
    const response = await fetch(`${API_URL}/auth/admin/verify-reset-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return await response.json();
  } catch (error) {
    console.error("Admin verify reset OTP error:", error);
    throw error;
  }
};

// Step 3: Set new password using resetToken
export const adminResetPassword = async (resetToken, newPassword, confirmPassword) => {
  try {
    const response = await fetch(`${API_URL}/auth/admin/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
    });
    return await response.json();
  } catch (error) {
    console.error("Admin reset password error:", error);
    throw error;
  }
};