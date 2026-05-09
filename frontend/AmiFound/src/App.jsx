import {
  useEffect,
  useState,
  useRef,
  lazy,
  Suspense,
  useCallback,
  Component,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { checkCurrentUser, logout } from "./services/authService";
import "./styles/App.css";

// ── Non-lazy components (always needed, no code-split overhead) ───────────────
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
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));

// ── Page Loader (Suspense fallback) ───────────────────────────────────────────
const PageLoader = () => (
  <div className="page-loader">
    <div className="loading-spinner">
      {/* FIX #6: explicit className so the spin animation is never fragile */}
      <FaSpinner className="spin-icon" />
      <p>Loading...</p>
    </div>
  </div>
);

// ── Error Boundary (FIX #9) ───────────────────────────────────────────────────
// Catches lazy-chunk load failures (e.g. network error) so the whole app
// doesn't white-screen. A class component is required — hooks can't do this.
class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ChunkErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-loader">
          <div className="loading-spinner">
            <FaExclamationTriangle style={{ color: "var(--red, #dc2626)" }} />
            <p>
              Failed to load page. Please check your connection and refresh.
            </p>
            <button
              className="btn btn--primary"
              style={{ marginTop: 16 }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── AppContent ────────────────────────────────────────────────────────────────
function AppContent() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // FIX #1: two separate loading states.
  // `authChecking` blocks rendering until the session is verified on mount.
  // `loading` is for user-triggered async actions (logout, form submit, etc.).
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState({
    text: "",
    type: "info",
    show: false,
  });

  // FIX #2 & #3: single ref to track the active toast timer.
  // Cleared on every new showMessage call and on unmount — no leaks, no stacking.
  const toastTimerRef = useRef(null);

  // ── Re-hydrate session on mount ─────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    checkCurrentUser()
      .then((user) => {
        if (!isMounted) return;

        if (user) {
          // FIX #4: checkCurrentUser should return { role, ...userData }.
          // Route based on the role stored in the response (or fall back to
          // localStorage if your authService still uses it).
          if (user.role === "admin") {
            setCurrentAdmin(user);
          } else {
            setCurrentUser(user);
          }
        } else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("userRole");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        setCurrentUser(null);
        setCurrentAdmin(null);
      })
      .finally(() => {
        if (isMounted) setAuthChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Clear toast timer on unmount (FIX #2) ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Callbacks ────────────────────────────────────────────────────────────────

  const showMessage = useCallback((text, type = "info") => {
    // FIX #3: cancel any in-flight timer before starting a new one
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);

    setMessage({ text, type, show: true });

    toastTimerRef.current = setTimeout(() => {
      setMessage((prev) => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  const handleCloseMessage = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setMessage((prev) => ({ ...prev, show: false }));
  }, []);

  const handleLogout = useCallback(() => {
    setLoading(true);

    logout()
      .then((data) => {
        if (data?.success) {
          showMessage("Logged out successfully", "success");
        } else {
          showMessage(data?.message || "Session ended", "warning");
        }
      })
      .catch((error) => {
        console.error("[Logout]", error);
        showMessage("Logged out locally", "warning");
      })
      .finally(() => {
        // FIX #5: clear state first, navigate last — explicit ordering
        setCurrentUser(null);
        setCurrentAdmin(null);
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        setLoading(false);
        navigate("/", { replace: true });
      });
  }, [navigate, showMessage]);

  // ── Block render until we know if the user is authenticated ─────────────────
  // FIX #1: show a lightweight spinner only during the initial session check,
  // not for every user action. Prevents flashing redirects to /auth pages.
  if (authChecking) {
    return <PageLoader />;
  }

  return (
    <div className="App">
      <Header
        currentUser={currentUser}
        currentAdmin={currentAdmin}
        onLogout={handleLogout}
      />
      <BackButton />

      {/* FIX #9: ErrorBoundary catches chunk-load failures gracefully */}
      <ChunkErrorBoundary>
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
                  currentUser.profileCompleted ? (
                    <StudentDashboard
                      currentUser={currentUser}
                      setLoading={setLoading}
                      showMessage={showMessage}
                    />
                  ) : (
                    <Navigate to="/complete-profile" replace />
                  )
                ) : (
                  <Navigate to="/student-auth" replace />
                )
              }
            />

            <Route
              path="/complete-profile"
              element={
                currentUser ? (
                  !currentUser.profileCompleted ? (
                    <CompleteProfile
                      currentUser={currentUser}
                      setCurrentUser={setCurrentUser}
                      showMessage={showMessage}
                    />
                  ) : (
                    <Navigate to="/student-dashboard" replace />
                  )
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

            {/* Catch-all: redirect unknown paths to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>

      {/* FIX #1: LoadingOverlay only shows for user-triggered actions, not auth check */}
      <LoadingOverlay show={loading} />
      <MessageToast message={message} onClose={handleCloseMessage} />
    </div>
  );
}

// ── App (Router wrapper) ──────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
