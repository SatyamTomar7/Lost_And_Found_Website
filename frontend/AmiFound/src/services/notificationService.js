import { getAuthHeaders } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getNotifications = async () => {
  const response = await fetch(`${API_URL}/notifications`, {
    headers: getAuthHeaders(),
  });

  return response.json();
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await fetch(
    `${API_URL}/notifications/${notificationId}/read`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
    },
  );
  return response.json();
};

export const markAllNotificationAsRead = async () => {
  const response = await fetch(`${API_URL}/notifications/read-all`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });
  return response.json();
};
