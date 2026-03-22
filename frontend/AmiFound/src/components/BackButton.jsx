import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const BackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Only hide on the exact root path
  const isHomePage = location.pathname === "/";
  if (isHomePage) return null;

const handleBack = () => {
  // location.key is "default" when user landed directly on this page
  // (typed URL, bookmarked, refreshed) — no browser history to go back to.
  // In that case, send them home instead of navigate(-1) which would
  // exit the app entirely.
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