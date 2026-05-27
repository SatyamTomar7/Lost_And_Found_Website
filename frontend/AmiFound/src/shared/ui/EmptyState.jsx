import React from "react";
import styles from "./EmptyState.module.css";

const EmptyState = React.memo(
  ({ icon: IconComponent, title, description, isSpinning }) => (
    <div className={styles["empty-state"]}>
      <IconComponent
        style={isSpinning ? { animation: "fa-spin 2s infinite linear" } : {}}
      />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
);

EmptyState.displayName = "EmptyState";

export default EmptyState;
