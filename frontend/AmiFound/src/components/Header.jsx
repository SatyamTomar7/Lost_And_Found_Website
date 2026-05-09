import { useLocation, useNavigate } from "react-router-dom";
import {
  FaUniversity,
  FaUserGraduate,
  FaUserShield,
  FaSignOutAlt,
} from "react-icons/fa";

const Header = ({ currentUser, currentAdmin, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname.includes("dashboard");

  return (
    <header className="header" id="header">
      <div className="container">
        <div className="nav-brand">
          <div
            className="logo"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/")}
          >
            <FaUniversity aria-hidden="true" />
            <span>Amity Lost &amp; Found</span>
          </div>
        </div>

        <nav className="nav-menu">
          {isDashboard && (currentUser || currentAdmin) && (
            <>
              <span
                style={{
                  marginRight: "16px",
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {currentUser ? (
                  <>
                    <FaUserGraduate
                      style={{ marginRight: "8px" }}
                      aria-hidden="true"
                    />
                    {currentUser.name}
                  </>
                ) : (
                  <>
                    <FaUserShield
                      style={{ marginRight: "8px" }}
                      aria-hidden="true"
                    />
                    {currentAdmin.block} block
                  </>
                )}
              </span>

              <button onClick={onLogout} className="btn btn--outline">
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
