import { FaSpinner } from "react-icons/fa";

const LoadingOverlay = ({ show }) => {
  if (!show) return null;

  return (
    <div
      className="loading-overlay show"
      role="status"
      aria-label="Loading, please wait"
    >
      <div className="loading-spinner" style={{ textAlign: "center" }}>
        <FaSpinner
          aria-hidden="true"
          style={{
            fontSize: "40px",
            color: "var(--color-primary)",
            animation: "spin 1s linear infinite",
          }}
        />
        <p>Processing...</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
