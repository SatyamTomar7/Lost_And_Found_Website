import { getAuthHeaders, getUploadHeaders } from "./authService";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const submitLostItem = async (itemData, photoFile) => {
  let photoData = null;

  // Step 1: Upload photo if provided
  if (photoFile) {
    const uploadData = new FormData();
    uploadData.append("image", photoFile);

    const uploadResponse = await fetch(`${API_URL}/upload/single`, {
      method: "POST",
      headers: getUploadHeaders(),
      body: uploadData,
    });

    const result = await uploadResponse.json();
    if (result.success && result.data && result.data.url) {
      photoData = {
        url: result.data.url,
        publicId: result.data.publicId,
      };
    } else {
      throw new Error(
        "Photo upload failed: " + (result.message || "Unknown error"),
      );
    }
  }

  // Step 2: Submit lost item with photo data
  const finalData = {
    ...itemData,
    ...(photoData && {
      photoUrl: photoData.url,
      photoPublicId: photoData.publicId,
    }),
  };

  const response = await fetch(`${API_URL}/lostitems`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(finalData),
  });

  return response.json();
};

export const getMyLostItems = async () => {
  const response = await fetch(`${API_URL}/lostitems/my`, {
    headers: getAuthHeaders(),
  });
  return response.json();
};

export const submitFoundItem = async (itemData) => {
  const response = await fetch(`${API_URL}/founditems/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(itemData),
  });
  return response.json();
};

export const getDepartmentFoundItems = async () => {
  const response = await fetch(`${API_URL}/founditems/department`, {
    headers: getAuthHeaders(),
  });
  return response.json();
};

export const updateFoundItemStatus = async (
  itemId,
  status,
  lostItemId,
  claimedByUserId,
) => {
  let url = "";
  let body = undefined;

  if (status === "Returned") {
    url = `${API_URL}/founditems/${itemId}/returned`;
    body = JSON.stringify({ lostItemId, claimedByUserId });
  } else if (status === "Unclaimed") {
    url = `${API_URL}/founditems/${itemId}/unclaimed`;
  } else {
    throw new Error("Invalid status");
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(),
    ...(body && { body }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update item status");
  }

  return response.json();
};
export const getMatchStats = async () => {
  const response = await fetch(`${API_URL}/matches/stats`, {
    headers: getAuthHeaders(),
  });
  return response.json();
};
export const getMatchedLostItemsForFoundItem = async (foundItemId) => {
  const response = await fetch(
    `${API_URL}/founditems/${foundItemId}/matched-lost-items`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch matched lost items");
  }

  return response.json();
};

export const markItemCollectedOffline = async (itemId) => {
  const response = await fetch(`${API_URL}/founditems/${itemId}/collected-offline`, {
    method: "PUT",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to mark item as collected offline");
  }

  return response.json();
};