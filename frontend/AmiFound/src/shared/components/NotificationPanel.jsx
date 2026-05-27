import React from "react";
import { FaBell, FaTimes, FaLink, FaExchangeAlt } from "react-icons/fa";
import styles from "./NotificationPanel.module.css";

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const diffInHours = (Date.now() - date) / (1000 * 60 * 60);
  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
  return date.toLocaleDateString();
};

const NotificationItem = React.memo(({ notification, onClick }) => (
  <button
    type="button"
    className={`${styles["notification-item"]} ${notification.isRead ? "" : styles.unread}`}
    onClick={() => onClick(notification._id)}
    aria-label={`${notification.title}. ${notification.message}`}
  >
    <div className={styles["notification-content"]}>
      <div className={styles["notification-icon"]}>
        {notification.type === "item_transferred" ? (
          <FaExchangeAlt />
        ) : (
          <FaLink />
        )}
      </div>
      <div className={styles["notification-text"]}>
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
        <div className={styles["notification-time"]}>
          {formatTimestamp(notification.createdAt)}
        </div>
      </div>
    </div>
  </button>
));
NotificationItem.displayName = "NotificationItem";

const NotificationPanel = React.memo(
  ({ isOpen, notifications = [], onClose, onNotificationClick }) => (
    <>
      <aside
        className={`${styles["notifications-panel"]} ${isOpen ? styles.open : ""}`}
        aria-label="Notifications panel"
        aria-hidden={!isOpen}
        role="dialog"
      >
        <div className={styles["notifications-header"]}>
          <h3>
            <FaBell /> Notifications
          </h3>
          <button
            onClick={onClose}
            className={styles["close-btn"]}
            aria-label="Close notifications"
            tabIndex={isOpen ? 0 : -1}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles["notifications-list"]}>
          {notifications.length === 0 ? (
            <div className={styles["empty-state"]}>
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
