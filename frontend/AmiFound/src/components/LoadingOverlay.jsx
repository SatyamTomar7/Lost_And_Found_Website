import { FaSpinner } from "react-icons/fa";

const LoadingOverlay = ({ show }) => {
  if (!show) return null;

  return (
    <div className="loading-overlay show">
      <div className="loading-spinner" style={{ textAlign: "center" }}>
        <FaSpinner
          style={{
            fontSize: "40px",
            color: "var(--color-primary)",
            animation: "spin 1s linear infinite",
          }}
        />
        <p>Processing...</p>
      </div>
      {/* <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style> */}
    </div>
  );
};

export default LoadingOverlay;
