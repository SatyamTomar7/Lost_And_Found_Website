import { getAuthHeaders } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getNotifications = async () => {
  try {
    const response = await fetch(`${API_URL}/notifications`, {
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error("Get notifications error:", error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await fetch(
      `${API_URL}/notifications/${notificationId}/read`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Mark notification as read error:", error);
    throw error;
  }
};

export const markAllNotificationAsRead = async () => {
  try {
    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
    return await response.json();
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    throw error;
  }
};