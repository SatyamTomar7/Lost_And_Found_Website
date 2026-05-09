import { useNavigate } from "react-router-dom";
import {
  FaSignInAlt,
  FaUserPlus,
  FaUniversity,
  FaSearch,
  FaBell,
  FaShieldAlt,
  FaBuilding,
} from "react-icons/fa";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="page active">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>
                Amity University
                <br />
                Lost &amp; Found System
              </h1>
              <p>
                A secure, efficient platform to report lost items and manage
                found items across all departments. Connect students with their
                belongings quickly and easily.
              </p>
              <div className="hero-buttons">
                <button
                  onClick={() => navigate("/login")}
                  className="btn btn--primary btn--lg"
                >
                  <FaSignInAlt aria-hidden="true" />
                  Login
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="btn btn--outline btn--lg"
                >
                  <FaUserPlus aria-hidden="true" />
                  Student Registration
                </button>
              </div>
            </div>

            <div className="hero-image">
              <div className="university-icon">
                <FaUniversity aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>System Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaSearch aria-hidden="true" />
              </div>
              <h3>Smart Matching</h3>
              <p>
                Automatic matching between lost and found items using
                intelligent search algorithms.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaBell aria-hidden="true" />
              </div>
              <h3>Real-time Notifications</h3>
              <p>
                Instant alerts when your lost item is found by any department.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaShieldAlt aria-hidden="true" />
              </div>
              <h3>Secure &amp; Private</h3>
              <p>
                OTP verification and secure data handling for student privacy.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaBuilding aria-hidden="true" />
              </div>
              <h3>Multi-Department</h3>
              <p>Coordinated management across all university blocks (A-E).</p>
            </div>
          </div>
        </div>
      </section>

      {/* Project Credits */}
      <div className="hero-credits">
        <span className="hero-credits__item">
          <span className="hero-credits__label">Developed by</span>
          Satyam Tomar
        </span>
        <span className="hero-credits__divider" aria-hidden="true">|</span>
        <span className="hero-credits__item">
          <span className="hero-credits__label">Mentor</span>
          Dr. Ashok Kumar Shrivastava
        </span>
      </div>
    </div>
  );
};

export default HomePage;