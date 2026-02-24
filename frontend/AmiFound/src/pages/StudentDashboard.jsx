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

import { submitLostItem, getMyLostItems } from "../services/itemService";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationAsRead,
} from "../services/notificationService";

// ─── Zod Schema (module-level, stable) ───────────────────────────────────────
const today = new Date().toISOString().split("T")[0];

const lostItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  color: z.string().min(1, "Color is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  dateLost: z
    .string()
    .min(1, "Date is required")
    .refine((d) => d <= today, { message: "Date cannot be in the future" }),
  placeLost: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  photo: z.any().optional(),
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
            <FaTag /> {item.category}
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
    onClick={() => onClick(notification.id)}
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
      category: "",
      brand: "",
      dateLost: "",
      placeLost: "",
      description: "",
    },
  });

  // ── Queries ───────────────────────────────────────────────────────────────
  // const { data: lostItems = [], isLoading: lostItemsLoading } = useQuery({
  //   queryKey: QUERY_KEYS.lostItems,
  //   queryFn: async () => {
  //     const result = await getMyLostItems();
  //     return result.data.data || [];
  //   },
  //   enabled: activeTab === "my-items",
  // });

  // const { data: notificationData = { notifications: [], unreadCount: 0 } } =
  //   useQuery({
  //     queryKey: QUERY_KEYS.notifications,
  //     queryFn: async () => {
  //       const result = await getNotifications();
  //       return {
  //         notifications: result.data.notifications || [],
  //         unreadCount: result.data.unreadCount || 0,
  //       };
  //     },
  //   });

  // 1. My Lost Items: Optimization
  const { data: lostItems = [], isLoading: lostItemsLoading } = useQuery({
    queryKey: QUERY_KEYS.lostItems,
    queryFn: async () => {
      const result = await getMyLostItems();
      return result.data.data || [];
    },
    enabled: activeTab === "my-items",
    staleTime: 1000 * 60 * 2, // 2 minutes tak fresh maano (User bar-bar tab badle toh fetch na ho)
    gcTime: 1000 * 60 * 10, // 10 minutes tak cache mein rakho
  });

  // 2. Notifications: Real-time Optimization (Polling)
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
      // Optimization Concept:
      staleTime: 0, // Notifications hamesha fresh check honi chahiye
      refetchInterval: 10000, // Har 10 seconds mein auto-fetch karega (Polling)
      refetchIntervalInBackground: false, // Jab user tab par na ho toh battery/data bachaye
      refetchOnWindowFocus: true, // Jab user wapas app par aaye toh turant check kare
    });

  const { notifications, unreadCount } = notificationData;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const submitLostItemMutation = useMutation({
    mutationFn: (data) => submitLostItem(data, data.photo?.[0]),
    onMutate: () => setLoading(true),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lostItems });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications }); //added by me
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
        {/* Header — main ke bahar */}
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

        {/* Nav — main ke bahar */}
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

        {/* Main — sirf tab content wrap karta hai */}
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
                      <input
                        id="name"
                        {...register("name")}
                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.name && (
                        <div className="error-message">
                          {errors.name.message}
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label htmlFor="color" className="form-label">
                        Color *
                      </label>
                      <input
                        id="color"
                        {...register("color")}
                        className={`form-control ${errors.color ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
                      {errors.color && (
                        <div className="error-message">
                          {errors.color.message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="category" className="form-label">
                        Category *
                      </label>
                      <select
                        id="category"
                        {...register("category")}
                        className={`form-control ${errors.category ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      >
                        <option value="">Select Category</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Books">Books</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Daily Items">Daily Items</option>
                        <option value="Jewelry">Jewelry</option>
                        <option value="Documents">Documents</option>
                      </select>
                      {errors.category && (
                        <div className="error-message">
                          {errors.category.message}
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
                      <input
                        id="placeLost"
                        {...register("placeLost")}
                        className={`form-control ${errors.placeLost ? "is-invalid" : ""}`}
                        disabled={isFormDisabled}
                      />
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
                    <LostItemCard key={item.id} item={item} />
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
                key={n.id}
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
