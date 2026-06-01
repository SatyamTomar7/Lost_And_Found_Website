import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  FaSignInAlt,
  FaUserPlus,
  FaUniversity,
} from "react-icons/fa";
import styles from "../HomePage.module.css";
import buttonStyles from "../../../shared/ui/Button.module.css";

const HomePage = () => {
  useEffect(() => {
    document.title = "AmiFound - Amity Lost & Found";
  }, []);

  return (
    <div className={`page active ${styles["home-page"]}`}>
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
        <span className={styles["hero-credits__copyright"]}>
          © AmiFound For any technical issue, please write to
          {" "}
          satyam.tomar2@s.amity.edu
        </span>
      </div>
    </div>
  );
};

export default HomePage;
