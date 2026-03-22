import { getAuthHeaders } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ==================== CORE FETCH HELPER ====================

/**
 * Wraps fetch with consistent HTTP error handling.
 * - Network failures → throws the original fetch error
 * - HTTP error responses (4xx, 5xx) → throws Error with server's message
 * - Success (2xx) → returns parsed JSON
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

// ==================== NOTIFICATIONS ====================

export const getNotifications = async () => {
  return apiFetch(`${API_URL}/notifications`, {
    headers: getAuthHeaders(),
  });
};

export const markNotificationAsRead = async (notificationId) => {
  return apiFetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
};

export const markAllNotificationAsRead = async () => {
  return apiFetch(`${API_URL}/notifications/read-all`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
};