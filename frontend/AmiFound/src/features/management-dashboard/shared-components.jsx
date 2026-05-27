import React from "react";
import studentStyles from "../student-dashboard/StudentDashboard.module.css";
import managementStyles from "./ManagementDashboard.module.css";
import { PILL_CLASS } from "./constants";

export const EmptyState = React.memo(
  ({ icon: IconComponent, title, description, isSpinning }) => (
    <div className={studentStyles["empty-state"]}>
      <IconComponent
        style={isSpinning ? { animation: "fa-spin 2s infinite linear" } : {}}
      />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
);
EmptyState.displayName = "EmptyState";

export const MgmtAvatar = ({ name = "" }) => (
  <span className={managementStyles["dd-avatar"]} aria-hidden="true">
    {name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)}
  </span>
);

export const BlockBadge = ({ block }) =>
  block ? (
    <span className={managementStyles["dd-block-badge"]}>{block}</span>
  ) : (
    <span className={managementStyles["dd-muted"]}>-</span>
  );

export const Pill = ({ status }) => {
  const key = (status || "").toLowerCase();
  return (
    <span
      className={`${managementStyles["dd-pill"]} ${managementStyles[PILL_CLASS[key] || "pill-pending"]}`}
    >
      {status || "-"}
    </span>
  );
};

export const ShimmerRows = ({ cols = 6, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className={managementStyles["dd-shimmer-row"]}>
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j}>
            <div
              className={`${managementStyles.shimmer} ${managementStyles["shimmer-cell"]}`}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);
