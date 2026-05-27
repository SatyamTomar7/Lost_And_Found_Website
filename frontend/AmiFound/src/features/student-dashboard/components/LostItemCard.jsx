import React from "react";
import { FaCalendarAlt, FaHome, FaMapMarkerAlt, FaPalette } from "react-icons/fa";
import buttonStyles from "../../../shared/ui/Button.module.css";
import styles from "../StudentDashboard.module.css";
import { canSelfResolve } from "../utils/studentDashboardHelpers";

const LostItemCard = React.memo(({ item, onSelfResolve, isResolving }) => (
  <div className={styles["item-card"]}>
    <div className={styles["item-header"]}>
      <div className={styles["item-info"]}>
        <h4>{item.name}</h4>
        <div className={styles["item-meta"]}>
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
      {(() => {
        const statusClass = item.status.toLowerCase().replace(/[\s_]/g, "-");
        return (
          <span
            className={`${styles.status} ${styles[`status--${statusClass}`] ?? ""}`}
          >
            {item.status === "self resolved" ? "Self Resolved" : item.status}
          </span>
        );
      })()}
    </div>
    {item.description && (
      <div className={styles["item-description"]}>{item.description}</div>
    )}
    {canSelfResolve(item.status) && (
      <div className={styles["item-actions"]}>
        <button
          className={`${buttonStyles.btn} ${buttonStyles["btn--sm"]} ${buttonStyles["btn--self-resolve"]}`}
          onClick={() => onSelfResolve(item)}
          disabled={isResolving}
          title="Found it at home? Close this report."
        >
          <FaHome /> Found it Myself
        </button>
      </div>
    )}
  </div>
));

LostItemCard.displayName = "LostItemCard";

export default LostItemCard;
