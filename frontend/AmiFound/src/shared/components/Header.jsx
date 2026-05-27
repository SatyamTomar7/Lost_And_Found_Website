import { useLocation, useNavigate } from "react-router-dom";
import {
  FaUniversity,
  FaUserGraduate,
  FaUserShield,
  FaSignOutAlt,
} from "react-icons/fa";
import styles from "./Header.module.css";
import buttonStyles from "../ui/Button.module.css";

const Header = ({ currentUser, currentAdmin, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname.includes("dashboard");

  return (
    <header className={styles.header} id="header">
      <div className="container">
        <div className={styles["nav-brand"]}>
          <button
            type="button"
            className={styles.logo}
            onClick={() => navigate("/")}
            aria-label="Go to home page"
          >
            <FaUniversity aria-hidden="true" />
            <span>Amity Lost &amp; Found</span>
          </button>
        </div>

        <nav className="nav-menu">
          {isDashboard && (currentUser || currentAdmin) && (
            <>
              <span className={styles["user-summary"]}>
                {currentUser ? (
                  <>
                    <FaUserGraduate
                      className={styles["user-summary-icon"]}
                      aria-hidden="true"
                    />
                    {currentUser.name}
                  </>
                ) : (
                  <>
                    <FaUserShield
                      className={styles["user-summary-icon"]}
                      aria-hidden="true"
                    />
                    {currentAdmin.block} block
                  </>
                )}
              </span>

              <button
                onClick={onLogout}
                className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]}`}
              >
                <FaSignOutAlt aria-hidden="true" />
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
