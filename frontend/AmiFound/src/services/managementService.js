// directorService.js — AmiFound Director API Service

import { getAuthHeaders } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  });
  const str = q.toString();
  return str ? `?${str}` : "";
};

// ── Analytics ──────────────────────────────────────────────────────────────
export const getDirectorAnalytics = () =>
  apiFetch(`${API_URL}/management/analytics`, { headers: getAuthHeaders() });

// ── Admins ─────────────────────────────────────────────────────────────────
export const getDirectorAdmins = ({ page = 1, limit = 10 } = {}) =>
  apiFetch(`${API_URL}/management/admins${buildQuery({ page, limit })}`, {
    headers: getAuthHeaders(),
  });

// ── Students (block filter) ────────────────────────────────────────────────
export const getDirectorStudents = ({ page = 1, limit = 10, block } = {}) =>
  apiFetch(`${API_URL}/management/students${buildQuery({ page, limit, block })}`, {
    headers: getAuthHeaders(),
  });

// ── Lost Items (block + status filters) ───────────────────────────────────
export const getDirectorLostItems = ({ page = 1, limit = 10, block, status } = {}) =>
  apiFetch(`${API_URL}/management/lostitems${buildQuery({ page, limit, block, status })}`, {
    headers: getAuthHeaders(),
  });

// ── Found Items (block + status filters) ──────────────────────────────────
export const getDirectorFoundItems = ({ page = 1, limit = 10, block, status } = {}) =>
  apiFetch(`${API_URL}/management/founditems${buildQuery({ page, limit, block, status })}`, {
    headers: getAuthHeaders(),
  });