import { useEffect, useState, lazy, Suspense, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import { checkCurrentUser, logout } from "./services/authService";
import "./styles/App.css";

// ── Non-lazy components (small, always needed) ────────────────────────────────
import BackButton from "./components/BackButton";
import Header from "./components/Header";
import MessageToast from "./components/MessageToast";
import LoadingOverlay from "./components/LoadingOverlay";

// ── Lazy-loaded page components ───────────────────────────────────────────────
const HomePage = lazy(() => import("./pages/HomePage"));
const StudentAuthPage = lazy(() => import("./pages/StudentAuthPage"));
const AdminAuthPage = lazy(() => import("./pages/AdminAuthPage"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// ─── Page Loader (Suspense fallback) ─────────────────────────────────────────

const PageLoader = () => (
  <div className="page-loader">
    <div className="loading-spinner">
      <FaSpinner
      />
      <p>Loading...</p>
    </div>
  </div>
);

// ─── AppContent ───────────────────────────────────────────────────────────────
function AppContent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    text: "",
    type: "info",
    show: false,
  });

  // ── Check Authentication on Mount ─────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    checkCurrentUser()
      .then((user) => {
        if (isMounted) {
          if (user) {
            setCurrentUser(user);
          } else {
            localStorage.removeItem("authToken");
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          localStorage.removeItem("authToken");
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const showMessage = useCallback((text, type = "info") => {
    setMessage({ text, type, show: true });
    // Auto-hide toast after 4 seconds
    setTimeout(() => {
      setMessage((prev) => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  const handleCloseMessage = useCallback(() => {
    setMessage((prev) => ({ ...prev, show: false }));
  }, []);

  const handleLogout = useCallback(() => {
    setLoading(true);

    const clearAuthAndExit = () => {
      setCurrentAdmin(null);
      setCurrentUser(null);
      localStorage.removeItem("authToken");
      setLoading(false);
      navigate("/");
    };

    logout()
      .then((data) => {
        if (data.success) {
          showMessage("Logged out successfully", "success");
        } else {
          showMessage(data.message || "Session ended with errors", "warning");
        }
      })
      .catch((error) => {
        console.error("Logout API Error:", error);
        showMessage("Logged out locally", "warning");
      })
      .finally(() => {
        clearAuthAndExit();
      });
  }, [navigate, showMessage]);

  return (
    <div className="App">
      <Header
        currentUser={currentUser}
        currentAdmin={currentAdmin}
        onLogout={handleLogout}
      />
      <BackButton />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/student-auth"
            element={
              currentUser ? (
                <Navigate to="/student-dashboard" replace />
              ) : (
                <StudentAuthPage
                  setCurrentUser={setCurrentUser}
                  setLoading={setLoading}
                  showMessage={showMessage}
                />
              )
            }
          />

          <Route
            path="/admin-auth"
            element={
              currentAdmin ? (
                <Navigate to="/admin-dashboard" replace />
              ) : (
                <AdminAuthPage
                  setCurrentAdmin={setCurrentAdmin}
                  setLoading={setLoading}
                  showMessage={showMessage}
                />
              )
            }
          />

          <Route
            path="/student-dashboard"
            element={
              currentUser ? (
                <StudentDashboard
                  currentUser={currentUser}
                  setLoading={setLoading}
                  showMessage={showMessage}
                />
              ) : (
                <Navigate to="/student-auth" replace />
              )
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              currentAdmin ? (
                <AdminDashboard
                  currentAdmin={currentAdmin}
                  setLoading={setLoading}
                  showMessage={showMessage}
                />
              ) : (
                <Navigate to="/admin-auth" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <LoadingOverlay show={loading} />
      <MessageToast message={message} onClose={handleCloseMessage} />
    </div>
  );
}

// ─── App (Router wrapper) ─────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;