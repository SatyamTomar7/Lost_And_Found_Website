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
    const error = new Error(
      body.message || `Request failed: ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return response.json();
};

// ==================== LOST ITEMS ====================

export const submitLostItem = async (itemData) => {
  const photoFile = itemData.photo?.[0];

  // Step 1: upload image if provided
  if (photoFile) {
    const uploadData = new FormData();
    uploadData.append("image", photoFile);

    const token = localStorage.getItem("authToken");
    const uploadResult = await apiFetch(`${API_URL}/upload/single`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // NO Content-Type — browser sets it for FormData
      body: uploadData,
    });

    itemData = {
      ...itemData,
      photoUrl: uploadResult.data.url,
      photoPublicId: uploadResult.data.publicId,
    };
  }

  // Step 2: submit lost item as JSON
  const { photo, ...rest } = itemData; // strip the FileList — can't JSON.stringify it
  return apiFetch(`${API_URL}/lostitems`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(rest),
  });
};

export const getMyLostItems = async () => {
  return apiFetch(`${API_URL}/lostitems/my`, {
    headers: getAuthHeaders(),
  });
};

export const selfResolveLostItem = async (itemId) => {
  return apiFetch(`${API_URL}/lostitems/${itemId}/self-resolve`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
};

// ==================== FOUND ITEMS ====================

export const submitFoundItem = async (itemData) => {
  return apiFetch(`${API_URL}/founditems/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData),
  });
};

export const getDepartmentFoundItems = async () => {
  return apiFetch(`${API_URL}/founditems/department`, {
    headers: getAuthHeaders(),
  });
};

export const updateFoundItemStatus = async (
  itemId,
  status,
  lostItemId,
  claimedByUserId,
) => {
  if (status === "Returned") {
    return apiFetch(`${API_URL}/founditems/${itemId}/returned`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ lostItemId, claimedByUserId }),
    });
  }

  if (status === "Unclaimed") {
    return apiFetch(`${API_URL}/founditems/${itemId}/unclaimed`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });
  }

  throw new Error("Invalid status");
};

export const getMatchedLostItemsForFoundItem = async (foundItemId) => {
  return apiFetch(`${API_URL}/founditems/${foundItemId}/matched-lost-items`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
};

export const markItemCollectedOffline = async (
  itemId,
  collectorName,
  collectorContact,
) => {
  return apiFetch(`${API_URL}/founditems/${itemId}/collected-offline`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ collectorName, collectorContact }),
  });
};

// ==================== MATCHES ====================

export const getMatchStats = async () => {
  return apiFetch(`${API_URL}/matches/stats`, {
    headers: getAuthHeaders(),
  });
};
