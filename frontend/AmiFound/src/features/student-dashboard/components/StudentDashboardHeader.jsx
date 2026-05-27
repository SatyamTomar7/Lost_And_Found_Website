import React from "react";
import { FaBell, FaUserGraduate } from "react-icons/fa";
import styles from "../StudentDashboard.module.css";

const StudentDashboardHeader = ({
  currentUser,
  unreadCount,
  showNotifications,
  onToggleNotifications,
}) => (
  <div className={styles["dashboard-header"]}>
    <div className={styles["user-info"]}>
      <div className={styles["user-avatar"]}>
        <FaUserGraduate />
      </div>
      <div className={styles["user-details"]}>
        <h3>{currentUser?.name}</h3>
        <p>{currentUser?.email}</p>
      </div>
    </div>
    <button
      onClick={onToggleNotifications}
      className={styles["notification-btn"]}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      aria-pressed={showNotifications}
    >
      <FaBell size={20} />
      {unreadCount > 0 && (
        <span className={styles["notification-badge"]}>{unreadCount}</span>
      )}
    </button>
  </div>
);

export default React.memo(StudentDashboardHeader);
