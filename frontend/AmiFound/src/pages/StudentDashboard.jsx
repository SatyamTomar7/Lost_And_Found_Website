import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FaPalette,
  FaTag,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaLink,
  FaSearch,
  FaInbox,
  FaUserGraduate,
  FaBell,
  FaPlusCircle,
  FaList,
  FaUser,
  FaTimes,
  FaPaperPlane,
  FaSpinner,
} from "react-icons/fa";
import {
  COLORS,
  ITEM_NAME,
  ITEM_CONDITIONS,
  CAMPUS_LOCATIONS,
} from "../utils/itemConstants";
import { submitLostItem, getMyLostItems } from "../services/itemService";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationAsRead,
} from "../services/notificationService";

// ─── Zod Schema (module-level, stable) ───────────────────────────────────────
const today = new Date().toISOString().split("T")[0];

const lostItemSchema = z.object({
  name: z.string().min(1, "Please select a name"),

  color: z.string().min(1, "Please select a color"),

  brand: z.string().max(20, "Brand name too long").optional().or(z.literal("")),
  condition: z.enum(["New", "Used"], {
    required_error: "Please select condition",
  }),
  dateLost: z
    .string()
    .min(1, "Date is required")
    .refine((d) => d <= today, { message: "Date cannot be in the future" }),
  placeLost: z.string().min(1, "Please select a location"),
  description: z
    .string()
    .max(100, "Description cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),

  photo: z
    .any()
    .refine(
      (files) => !files || files.length === 0 || files[0].size <= 5000000,
      `Max file size is 5MB.`,
    )
    .refine(
      (files) =>
        !files ||
        files.length === 0 ||
        ["image/jpeg", "image/png", "image/jpg"].includes(files[0].type),
      ".jpg, .jpeg, and .png files are accepted.",
    )
    .optional(),
});

const resolver = zodResolver(lostItemSchema);

const QUERY_KEYS = {
  lostItems: ["lostItems"],
  notifications: ["notifications"],
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
  return date.toLocaleDateString();
};

// ─── Sub-Components (Memoized) ────────────────────────────────────────────────

const LostItemCard = React.memo(({ item }) => (
  <div className="item-card">
    <div className="item-header">
      <div className="item-info">
        <h4>{item.name}</h4>
        <div className="item-meta">
          <span>
            <FaPalette /> {item.color}
          </span>
          <span>
            <FaCalendarAlt /> {new Date(item.dateLost).toLocaleDateString()}
          </span>
          <span>
            <FaMapMarkerAlt /> {item.placeLost}
          </span>
        </div>
      </div>
      <span className={`status status--${item.status.toLowerCase()}`}>
        {item.status}
      </span>
    </div>
    {item.description && (
      <div className="item-description">{item.description}</div>
    )}
  </div>
));
LostItemCard.displayName = "LostItemCard";

const NotificationItem = React.memo(({ notification, onClick }) => (
  <div
    className={`notification-item ${notification.isRead ? "" : "unread"}`}
    onClick={() => onClick(notification._id)}
  >
    <div className="notification-content">
      <div className="notification-icon">
        {notification.type === "match" ? <FaLink /> : <FaSearch />}
      </div>
      <div className="notification-text">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
        <div className="notification-time">
          {formatTimestamp(notification.createdAt)}
        </div>
      </div>
    </div>
  </div>
));
NotificationItem.displayName = "NotificationItem";

const EmptyState = React.memo(
  ({ icon: IconComponent, title, description, isSpinning }) => (
    <div className="empty-state">
      <IconComponent
        style={isSpinning ? { animation: "fa-spin 2s infinite linear" } : {}}
      />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

const ProfileField = React.memo(({ label, value }) => (
  <div className="profile-field">
    <label>{label}:</label>
    <span>{value}</span>
  </div>
));
ProfileField.displayName = "ProfileField";

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentDashboard = ({ currentUser, setLoading, showMessage }) => {
  const [activeTab, setActiveTab] = useState("report-lost");
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver,
    defaultValues: {
      name: "",
      color: "",
      brand: "",
      dateLost: "",
      placeLost: "",
      description: "",
      condition: "Used",
    },
  });

  // ── Queries ───────────────────────────────────────────────────────────────

  // 1. My Lost Items: Poll every 5s so status updates (e.g. Pending → Collected)
  //    appear quickly without the student needing to manually refresh.
  const { data: lostItems = [], isLoading: lostItemsLoading } = useQuery({
    queryKey: QUERY_KEYS.lostItems,
    queryFn: async () => {
      const result = await getMyLostItems();
      return result.data.data || [];
    },
    enabled: activeTab === "my-items",
    staleTime: 0, // Always treat as stale so refetch fires reliably
    gcTime: 1000 * 60 * 5, // Keep in cache 5 min
    refetchInterval: 5000, // Poll every 5 seconds while tab is active
    refetchIntervalInBackground: false, // Pause polling when window is hidden
    refetchOnWindowFocus: true, // Immediately refetch when user returns to tab
  });

  // 2. Notifications: Poll every 3s for near-instant status change alerts
  const { data: notificationData = { notifications: [], unreadCount: 0 } } =
    useQuery({
      queryKey: QUERY_KEYS.notifications,
      queryFn: async () => {
        const result = await getNotifications();
        return {
          notifications: result.data.notifications || [],
          unreadCount: result.data.unreadCount || 0,
        };
      },
      staleTime: 0,
      refetchInterval: 3000, // Reduced from 10s → 3s for near-instant updates
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });

  const { notifications, unreadCount } = notificationData;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const submitLostItemMutation = useMutation({
    mutationFn: (data) => submitLostItem(data, data.photo?.[0]),
    onMutate: () => setLoading(true),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lostItems });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      showMessage("Lost Item reported successfully!", "success");
    },
    onError: (err) =>
      showMessage(err.message || "Something went wrong", "error"),
    onSettled: () => setLoading(false),
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => markNotificationAsRead(notificationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationAsRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications }),
  });

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleNotificationClick = useCallback(
    (notificationId) => {
      markReadMutation.mutate(notificationId);
    },
    [markReadMutation],
  );

  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const isFormDisabled = isSubmitting || submitLostItemMutation.isPending;

  const joinDate = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "N/A";

  return (
    <div className="page active">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="user-info">
            <div className="user-avatar">
              <FaUserGraduate />
            </div>
            <div className="user-details">
              <h3>{currentUser?.name}</h3>
              <p>{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="notification-btn"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          >
            <FaBell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav
          className="dashboard-nav"
          role="tablist"
          aria-label="Dashboard navigation"
        >
          {["report-lost", "my-items", "profile"].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`${tab}-panel`}
              className={`nav-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace("-", " ").toUpperCase()}
            </button>
          ))}
        </nav>

        {/* Main */}
        <main className="dashboard-content-area">
          {activeTab === "report-lost" && (
            <div
              className="dashboard-tab active"
              role="tabpanel"
              id="report-lost-panel"
              aria-labelledby="report-lost"
            >
              <div className="tab-content">
                <h2>
                  <FaPlusCircle /> Report Lost Item
                </h2>

                <form
                  onSubmit={handleSubmit((data) =>
                    submitLostItemMutation.mutate(data),
                  )}
                  className="dashboard-form"
                >
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name" className="form-label">
                        Item Name *
                      </label>
                      <select
                        id="name"
                        {...register("name")}
                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      >
                        <option value="">Select Name</option>
                        {ITEM_NAME.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      {errors.name && (
                        <div className="error-message">
                          {errors.name.message}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="itemColor" className="form-label">
                        Color *
                      </label>
                      <select
                        id="itemColor"
                        {...register("color")}
                        className={`form-control ${errors.color ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                        aria-invalid={errors.color ? "true" : "false"}
                      >
                        <option value="">Select a color</option>
                        {COLORS.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                      {errors.color && (
                        <div className="error-message" role="alert">
                          {errors.color.message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Item Condition *</label>
                      <div
                        style={{
                          display: "flex",
                          gap: "20px",
                          marginTop: "10px",
                          alignItems: "center",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          <input
                            type="radio"
                            value={ITEM_CONDITIONS.NEW}
                            {...register("condition")}
                            disabled={isFormDisabled}
                            style={{ width: "16px", height: "16px" }}
                          />
                          New
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          <input
                            type="radio"
                            value={ITEM_CONDITIONS.USED}
                            {...register("condition")}
                            disabled={isFormDisabled}
                            style={{ width: "16px", height: "16px" }}
                          />
                          Used
                        </label>
                      </div>
                      {errors.condition && (
                        <div
                          className="error-message"
                          style={{ marginTop: "5px" }}
                        >
                          {errors.condition.message}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="brand" className="form-label">
                        Brand (optional)
                      </label>
                      <input
                        id="brand"
                        {...register("brand")}
                        className="form-control"
                        disabled={isFormDisabled}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="placeLost" className="form-label">
                        Place Lost *
                      </label>
                      <select
                        id="placeLost"
                        {...register("placeLost")}
                        className={`form-control ${errors.placeLost ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      >
                        <option value="">Select Location</option>
                        {CAMPUS_LOCATIONS.map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                      {errors.placeLost && (
                        <div className="error-message">
                          {errors.placeLost.message}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="dateLost" className="form-label">
                        Date Lost *
                      </label>
                      <input
                        id="dateLost"
                        type="date"
                        max={today}
                        {...register("dateLost")}
                        className={`form-control ${errors.dateLost ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.dateLost && (
                        <div className="error-message">
                          {errors.dateLost.message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="description" className="form-label">
                      Description (optional)
                    </label>
                    <textarea
                      id="description"
                      {...register("description")}
                      className="form-control"
                      rows={3}
                      disabled={isFormDisabled}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="photo" className="form-label">
                      Photo (optional)
                    </label>
                    <input
                      id="photo"
                      type="file"
                      {...register("photo")}
                      className="form-control"
                      accept="image/*"
                      disabled={isFormDisabled}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn--primary btn--full-width"
                    disabled={isFormDisabled}
                  >
                    <FaPaperPlane />
                    {submitLostItemMutation.isPending
                      ? "Submitting…"
                      : "Submit Report"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "my-items" && (
            <div
              className="dashboard-tab active"
              role="tabpanel"
              id="my-items-panel"
              aria-labelledby="my-items"
            >
              <div className="tab-content">
                <h2>
                  <FaList /> My Lost Items
                </h2>
                {lostItemsLoading ? (
                  <EmptyState
                    icon={FaSpinner}
                    title=""
                    description="Loading…"
                    isSpinning
                  />
                ) : lostItems.length === 0 ? (
                  <EmptyState
                    icon={FaInbox}
                    title="No Lost Items"
                    description="You haven't reported anything yet."
                  />
                ) : (
                  lostItems.map((item) => (
                    <LostItemCard key={item._id} item={item} />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div
              className="dashboard-tab active"
              role="tabpanel"
              id="profile-panel"
              aria-labelledby="profile"
            >
              <div className="tab-content">
                <h2>
                  <FaUser /> Profile Information
                </h2>
                <div className="profile-info">
                  <ProfileField label="Name" value={currentUser?.name} />
                  <ProfileField label="Email" value={currentUser?.email} />
                  <ProfileField label="Join Date" value={joinDate} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <aside
        className={`notifications-panel ${showNotifications ? "open" : ""}`}
        aria-label="Notifications panel"
        aria-hidden={!showNotifications}
      >
        <div className="notifications-header">
          <h3>
            <FaBell /> Notifications
          </h3>
          <button
            onClick={handleCloseNotifications}
            className="close-btn"
            aria-label="Close notifications"
            tabIndex={showNotifications ? 0 : -1}
          >
            <FaTimes />
          </button>
        </div>

        <div className="notifications-list">
          {notifications.length === 0 ? (
            <EmptyState
              icon={FaBell}
              title="Clear!"
              description="No new notifications."
            />
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onClick={handleNotificationClick}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

export default React.memo(StudentDashboard);
