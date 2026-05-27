import React from "react";
import { FaInbox, FaList, FaSpinner } from "react-icons/fa";
import { EmptyState } from "../../../shared/ui";
import styles from "../StudentDashboard.module.css";
import LostItemCard from "./LostItemCard";

const MyItemsTab = ({
  lostItems,
  lostItemsLoading,
  onSelfResolve,
  isResolving,
}) => (
  <div
    className={`${styles["dashboard-tab"]} ${styles.active}`}
    role="tabpanel"
    id="my-items-panel"
    aria-labelledby="my-items"
  >
    <div className={styles["tab-content"]}>
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
          <LostItemCard
            key={item._id}
            item={item}
            onSelfResolve={onSelfResolve}
            isResolving={isResolving}
          />
        ))
      )}
    </div>
  </div>
);

export default React.memo(MyItemsTab);
