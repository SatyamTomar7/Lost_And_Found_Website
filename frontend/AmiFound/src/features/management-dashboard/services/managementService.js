import { apiFetch } from "../../../shared/lib/apiClient";
import { getAuthHeaders } from "../../auth/services/authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ==================== QUERY BUILDER ====================

const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  });
  const str = q.toString();
  return str ? `?${str}` : "";
};

// ==================== ANALYTICS ====================

export const getDirectorAnalytics = () =>
  apiFetch(`${API_URL}/management/analytics`, {
    headers: getAuthHeaders(),
  });

// ==================== ADMINS ====================

export const getDirectorAdmins = ({ cursor, limit = 10 } = {}) =>
  apiFetch(`${API_URL}/management/admins${buildQuery({ cursor, limit })}`, {
    headers: getAuthHeaders(),
  });

// ==================== STUDENTS ====================

export const getDirectorStudents = ({ cursor, limit = 10, block } = {}) =>
  apiFetch(
    `${API_URL}/management/students${buildQuery({ cursor, limit, block })}`,
    { headers: getAuthHeaders() },
  );

// ==================== LOST ITEMS ====================

export const getDirectorLostItems = ({
  cursor,
  limit = 10,
  block,
  status,
} = {}) =>
  apiFetch(
    `${API_URL}/management/lostitems${buildQuery({ cursor, limit, block, status })}`,
    { headers: getAuthHeaders() },
  );

// ==================== FOUND ITEMS ====================

export const getDirectorFoundItems = ({
  cursor,
  limit = 10,
  block,
  status,
} = {}) =>
  apiFetch(
    `${API_URL}/management/founditems${buildQuery({ cursor, limit, block, status })}`,
    { headers: getAuthHeaders() },
  );

export const deleteManagementResource = (resource, id) =>
  apiFetch(`${API_URL}/management/${resource}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
