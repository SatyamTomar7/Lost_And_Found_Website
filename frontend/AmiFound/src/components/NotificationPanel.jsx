import React from "react";
import { FaBell, FaTimes, FaLink, FaExchangeAlt } from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const diffInHours = (Date.now() - date) / (1000 * 60 * 60);
  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
  return date.toLocaleDateString();
};

// ─── NotificationItem ─────────────────────────────────────────────────────────
const NotificationItem = React.memo(({ notification, onClick }) => (
  <div
    className={`notification-item ${notification.isRead ? "" : "unread"}`}
    onClick={() => onClick(notification._id)}
  >
    <div className="notification-content">
      <div className="notification-icon">
        {notification.type === "item_transferred" ? (
          <FaExchangeAlt />
        ) : (
          <FaLink />
        )}
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

// ─── NotificationPanel ────────────────────────────────────────────────────────
const NotificationPanel = React.memo(
  ({ isOpen, notifications = [], onClose, onNotificationClick }) => (
    <>
      {/* Bell button is rendered by the parent — this is just the slide-in panel */}
      <aside
        className={`notifications-panel ${isOpen ? "open" : ""}`}
        aria-label="Notifications panel"
        aria-hidden={!isOpen}
      >
        <div className="notifications-header">
          <h3>
            <FaBell /> Notifications
          </h3>
          <button
            onClick={onClose}
            className="close-btn"
            aria-label="Close notifications"
            tabIndex={isOpen ? 0 : -1}
          >
            <FaTimes />
          </button>
        </div>

        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <FaBell />
              <h3>All clear!</h3>
              <p>No new notifications.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onClick={onNotificationClick}
              />
            ))
          )}
        </div>
      </aside>
    </>
  ),
);
NotificationPanel.displayName = "NotificationPanel";

export default NotificationPanel;