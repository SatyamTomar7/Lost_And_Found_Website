import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";
import styles from "./MessageToast.module.css";

const iconMap = {
  success: FaCheckCircle,
  error: FaExclamationCircle,
  info: FaInfoCircle,
  warning: FaExclamationTriangle,
};

// Auto-close is handled by App.jsx's showMessage (setTimeout there).
// No duplicate useEffect here to avoid double-close calls.
const MessageToast = ({ message, onClose }) => {
  const IconComponent = iconMap[message.type] || iconMap.info;

  return (
    <div
      className={`${styles["message-toast"]} ${styles[message.type] || ""} ${message.show ? styles.show : ""}`}
    >
      <div className={styles["toast-content"]}>
        <IconComponent className={styles["toast-icon"]} />
        <span className={styles["toast-text"]}>{message.text}</span>
        {onClose && (
          <button
            onClick={onClose}
            className={styles["toast-close"]}
            aria-label="Close notification"
          >
            <FaTimes aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageToast;
