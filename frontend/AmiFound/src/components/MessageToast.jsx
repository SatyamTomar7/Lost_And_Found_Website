import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaTimes,
} from "react-icons/fa";

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
      className={`message-toast ${message.type} ${message.show ? "show" : ""}`}
    >
      <div
        className="toast-content"
      >
        <IconComponent className="toast-icon" />
        <span className="toast-text">{message.text}</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              fontSize: "14px",
            }}
            aria-label="Close notification"
          >
            <FaTimes />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageToast;