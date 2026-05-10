import { apiFetch, UPLOAD_TIMEOUT } from "./apiClient";
import { getAuthHeaders } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ==================== LOST ITEMS ====================

export const submitLostItem = async (itemData) => {
  const photoFile = itemData.photo?.[0];

  // Step 1: upload image if provided — longer timeout for file upload
  if (photoFile) {
    const uploadData = new FormData();
    uploadData.append("image", photoFile);

    const token = localStorage.getItem("authToken");
    const uploadResult = await apiFetch(
      `${API_URL}/upload/single`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // No Content-Type — browser sets it for FormData
        body: uploadData,
      },
      UPLOAD_TIMEOUT
    );

    itemData = {
      ...itemData,
      photoUrl: uploadResult.data.url,
      photoPublicId: uploadResult.data.publicId,
    };
  }

  // Step 2: submit lost item as JSON
  const { photo, ...rest } = itemData; // strip FileList — can't JSON.stringify it
  return apiFetch(`${API_URL}/lostitems`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(rest),
  });
};

export const getMyLostItems = async () =>
  apiFetch(`${API_URL}/lostitems/my`, {
    headers: getAuthHeaders(),
  });

export const selfResolveLostItem = async (itemId) =>
  apiFetch(`${API_URL}/lostitems/${itemId}/self-resolve`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });

// ==================== FOUND ITEMS ====================

export const submitFoundItem = async (itemData) =>
  apiFetch(`${API_URL}/founditems/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData),
  });

export const getDepartmentFoundItems = async () =>
  apiFetch(`${API_URL}/founditems/department`, {
    headers: getAuthHeaders(),
  });

export const updateFoundItemStatus = async (
  itemId,
  status,
  lostItemId,
  claimedByUserId
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

export const getMatchedLostItemsForFoundItem = async (foundItemId) =>
  apiFetch(`${API_URL}/founditems/${foundItemId}/matched-lost-items`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

export const markItemCollectedOffline = async (
  itemId,
  collectorName,
  collectorContact
) =>
  apiFetch(`${API_URL}/founditems/${itemId}/collected-offline`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ collectorName, collectorContact }),
  });

// ==================== MATCHES ====================

export const getMatchStats = async () =>
  apiFetch(`${API_URL}/matches/stats`, {
    headers: getAuthHeaders(),
  });