import { apiFetch } from "./apiClient";
import { getAuthHeaders } from "./authService";

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

export const getDirectorAdmins = ({ page = 1, limit = 10 } = {}) =>
  apiFetch(
    `${API_URL}/management/admins${buildQuery({ page, limit })}`,
    { headers: getAuthHeaders() }
  );

// ==================== STUDENTS ====================

export const getDirectorStudents = ({ page = 1, limit = 10, block } = {}) =>
  apiFetch(
    `${API_URL}/management/students${buildQuery({ page, limit, block })}`,
    { headers: getAuthHeaders() }
  );

// ==================== LOST ITEMS ====================

export const getDirectorLostItems = ({
  page = 1,
  limit = 10,
  block,
  status,
} = {}) =>
  apiFetch(
    `${API_URL}/management/lostitems${buildQuery({ page, limit, block, status })}`,
    { headers: getAuthHeaders() }
  );

// ==================== FOUND ITEMS ====================

export const getDirectorFoundItems = ({
  page = 1,
  limit = 10,
  block,
  status,
} = {}) =>
  apiFetch(
    `${API_URL}/management/founditems${buildQuery({ page, limit, block, status })}`,
    { headers: getAuthHeaders() }
  );