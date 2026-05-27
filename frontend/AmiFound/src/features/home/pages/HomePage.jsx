import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  FaSignInAlt,
  FaUserPlus,
  FaUniversity,
  FaSearch,
  FaBell,
  FaShieldAlt,
  FaBuilding,
} from "react-icons/fa";
import styles from "../HomePage.module.css";
import buttonStyles from "../../../shared/ui/Button.module.css";

const HomePage = () => {
  useEffect(() => {
    document.title = "AmiFound - Amity Lost & Found";
  }, []);

  return (
    <div className="page active">
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles["hero-content"]}>
            <div className={styles["hero-text"]}>
              <h1>
                AmiFound
                <br />
                Amity University Lost & Found System
              </h1>
              <p>
                A secure, efficient platform to report lost items and manage
                found items across university blocks and the university security
                department. Connect students with their belongings quickly and
                easily.
              </p>
              <div className={styles["hero-buttons"]}>
                <Link
                  to="/login"
                  className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${buttonStyles["btn--lg"]}`}
                >
                  <FaSignInAlt aria-hidden="true" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]} ${buttonStyles["btn--lg"]}`}
                >
                  <FaUserPlus aria-hidden="true" />
                  Create Account
                </Link>
              </div>
            </div>

            <div className={styles["hero-image"]}>
              <div className={styles["university-icon"]}>
                <FaUniversity aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className="container">
          <h2>System Features</h2>
          <div className={styles["features-grid"]}>
            <div className={styles["feature-card"]}>
              <div className={styles["feature-icon"]}>
                <FaSearch aria-hidden="true" />
              </div>
              <h3>Smart Matching</h3>
              <p>
                Automatic matching between lost and found items using
                intelligent search algorithms.
              </p>
            </div>

            <div className={styles["feature-card"]}>
              <div className={styles["feature-icon"]}>
                <FaBell aria-hidden="true" />
              </div>
              <h3>Real-time Notifications</h3>
              <p>
                Instant alerts when your lost item is found by any department.
              </p>
            </div>

            <div className={styles["feature-card"]}>
              <div className={styles["feature-icon"]}>
                <FaShieldAlt aria-hidden="true" />
              </div>
              <h3>Secure &amp; Private</h3>
              <p>
                OTP verification and secure data handling for student privacy.
              </p>
            </div>

            <div className={styles["feature-card"]}>
              <div className={styles["feature-icon"]}>
                <FaBuilding aria-hidden="true" />
              </div>
              <h3>Multi-Department</h3>
              <p>
                Coordinated management across all university blocks and security
                department.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Project Credits */}
      <div className={styles["hero-credits"]}>
        <span className={styles["hero-credits__item"]}>
          <span className={styles["hero-credits__label"]}>Developed by</span>
          Satyam Tomar
        </span>
        <span className={styles["hero-credits__divider"]} aria-hidden="true">
          |
        </span>
        <span className={styles["hero-credits__item"]}>
          <span className={styles["hero-credits__label"]}>Mentor</span>
          Dr. Ashok Kumar Shrivastava
        </span>
      </div>
    </div>
  );
};

export default HomePage;
