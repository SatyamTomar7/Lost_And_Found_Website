import { apiFetch } from "./apiClient";
import { getAuthHeaders } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ==================== NOTIFICATIONS ====================

export const getNotifications = async () =>
  apiFetch(`${API_URL}/notifications`, {
    headers: getAuthHeaders(),
  });

export const markNotificationAsRead = async (notificationId) =>
  apiFetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

export const markAllNotificationAsRead = async () =>
  apiFetch(`${API_URL}/notifications/read-all`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });