import React from "react";
import styles from "../StudentDashboard.module.css";

const tabs = ["report-lost", "my-items", "profile"];

const StudentDashboardNav = ({ activeTab, onTabChange }) => (
  <nav
    className={styles["dashboard-nav"]}
    role="tablist"
    aria-label="Dashboard navigation"
  >
    {tabs.map((tab) => (
      <button
        key={tab}
        role="tab"
        aria-selected={activeTab === tab}
        aria-controls={`${tab}-panel`}
        className={`${styles["nav-tab"]} ${activeTab === tab ? styles.active : ""}`}
        onClick={() => onTabChange(tab)}
      >
        {tab.replace("-", " ").toUpperCase()}
      </button>
    ))}
  </nav>
);

export default React.memo(StudentDashboardNav);
