import { FaSpinner } from "react-icons/fa";
import styles from "../ui/Loader.module.css";

const LoadingOverlay = ({ show }) => {
  if (!show) return null;

  return (
    <div
      className={`${styles["loading-overlay"]} ${styles.show}`}
      role="status"
      aria-label="Loading, please wait"
    >
      <div
        className={`${styles["loading-spinner"]} ${styles["loading-spinner-content"]}`}
      >
        <FaSpinner
          aria-hidden="true"
          className={styles["loading-spinner-icon"]}
        />
        <p>Processing...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
