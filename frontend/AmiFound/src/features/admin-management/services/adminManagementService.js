import { apiFetch } from "../../../shared/lib/apiClient";
import { getAuthHeaders } from "../../auth/services/authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getAdminAssignments = () =>
  apiFetch(`${API_URL}/admin-management/admins`, {
    headers: getAuthHeaders(),
  });

export const updateAdminAssignments = (payload) =>
  apiFetch(`${API_URL}/admin-management/departments`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const getAdminAssignmentHistory = () =>
  apiFetch(`${API_URL}/admin-management/history`, {
    headers: getAuthHeaders(),
  });
