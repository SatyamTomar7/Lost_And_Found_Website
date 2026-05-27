export const today = new Date().toISOString().split("T")[0];

export const minSelectableDate = new Date(
  Date.now() - 6 * 24 * 60 * 60 * 1000,
)
  .toISOString()
  .split("T")[0];

export const STUDENT_DASHBOARD_QUERY_KEYS = {
  lostItems: ["lostItems"],
  notifications: ["notifications"],
};

export const STUDENT_DASHBOARD_QUERY_TIMINGS = {
  dataStaleTime: 30 * 1000,
  dataGcTime: 5 * 60 * 1000,
  notificationStaleTime: 15 * 1000,
  notificationRefetchInterval: 30 * 1000,
};
