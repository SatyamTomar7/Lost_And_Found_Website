import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const BackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Only hide on the exact root path
  const isHomePage = location.pathname === "/";
  if (isHomePage) return null;

  const handleBack = () => {
    // location.key is 'default' if the user landed here directly (no history)
    if (location.key === "default") {
      navigate("/", { replace: true });
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      className="back-btn"
      onClick={handleBack}
      aria-label="Go back to previous page"
      title="Go back"
    >
      <FaArrowLeft aria-hidden="true" />
      <span>Back</span>
    </button>
  );
};

export default BackButton;