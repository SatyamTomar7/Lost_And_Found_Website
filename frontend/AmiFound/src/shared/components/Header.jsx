import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaUniversity,
  FaUserGraduate,
  FaUserShield,
  FaSignOutAlt,
  FaHeadset,
  FaPhoneAlt,
  FaEnvelope,
  FaWhatsapp,
} from "react-icons/fa";
import styles from "./Header.module.css";
import buttonStyles from "../ui/Button.module.css";

const SUPPORT_PHONE = "7440325709";
const SUPPORT_EMAIL = "tomarsatyam367@gmail.com";
const WHATSAPP_LINK = `https://wa.me/91${SUPPORT_PHONE}`;

const Header = ({ currentUser, currentAdmin, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpPanelRef = useRef(null);

  const isDashboard = location.pathname.includes("dashboard");

  useEffect(() => {
    setIsHelpOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!helpPanelRef.current?.contains(event.target)) {
        setIsHelpOpen(false);
      }
    };

    if (isHelpOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isHelpOpen]);

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

          <div className={styles["help-wrapper"]} ref={helpPanelRef}>
            <button
              type="button"
              className={styles["help-trigger"]}
              onClick={() => setIsHelpOpen((prev) => !prev)}
              aria-expanded={isHelpOpen}
              aria-controls="help-panel"
            >
              <FaHeadset aria-hidden="true" />
              <span>Help</span>
            </button>

            {isHelpOpen && (
              <div className={styles["help-panel"]} id="help-panel" role="dialog">
                <p className={styles["help-title"]}>Need help with a lost item?</p>
                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className={styles["help-link"]}
                >
                  <FaPhoneAlt aria-hidden="true" />
                  <span>Call: {SUPPORT_PHONE}</span>
                </a>
                <a
                  href={WHATSAPP_LINK}
                  className={styles["help-link"]}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaWhatsapp aria-hidden="true" />
                  <span>WhatsApp: {SUPPORT_PHONE}</span>
                </a>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={styles["help-link"]}
                >
                  <FaEnvelope aria-hidden="true" />
                  <span>Email: {SUPPORT_EMAIL}</span>
                </a>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
