import { Link } from "react-router-dom";
import { FaLock } from "react-icons/fa";
import loaderStyles from "../ui/Loader.module.css";
import buttonStyles from "../ui/Button.module.css";
import { getDashboardRoute } from "../../features/auth/constants";

export default function AccessDeniedPage({ currentUser, allowedRoles = [] }) {
  const dashboardRoute = currentUser
    ? getDashboardRoute(currentUser.role)
    : "/login";
  const allowedLabel =
    allowedRoles.length > 0 ? allowedRoles.join(", ") : "authorized users";

  return (
    <div className={loaderStyles["page-loader"]}>
      <div className={loaderStyles["loading-spinner"]}>
        <FaLock className={loaderStyles["chunk-error-icon"]} />
        <p>
          Access denied. This page is available only for {allowedLabel}.
        </p>
        <div className={loaderStyles["session-recovery-actions"]}>
          <Link
            to={dashboardRoute}
            className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
          >
            Go To My Dashboard
          </Link>
          {!currentUser && (
            <Link
              to="/login"
              className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]}`}
            >
              Go To Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
