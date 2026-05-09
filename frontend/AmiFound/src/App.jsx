
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

// ── Non-lazy components (always needed) ───────────────────────────────────────
import BackButton from "./components/BackButton";
import Header from "./components/Header";
import MessageToast from "./components/MessageToast";
import LoadingOverlay from "./components/LoadingOverlay";

// ── Lazy-loaded page components ───────────────────────────────────────────────
const HomePage = lazy(() => import("./pages/HomePage"));
const UnifiedAuthPage = lazy(() => import("./pages/Auth"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
// const AdminDashboard    = lazy(() => import("./pages/AdminDashboard"));
const ManagementDashboard = lazy(() => import("./pages/ManagementDashboard"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));

// ── Page Loader (Suspense fallback) ───────────────────────────────────────────
const PageLoader = () => (
  <div className="page-loader">
    <div className="loading-spinner">
      <FaSpinner className="spin-icon" />
      <p>Loading...</p>
    </div>
  </div>
);

// ── Error Boundary ────────────────────────────────────────────────────────────
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

// ── Role → dashboard route ────────────────────────────────────────────────────
const getDashboardRoute = (role) => {
  switch (role) {
    case "admin":
    case "director":
    case "security":
      return "/management-dashboard";
    default:
      return "/student-dashboard";
  }
};

// ── Protected route helpers ───────────────────────────────────────────────────

// Requires a logged-in user with one of the allowed roles.
// If not logged in → /login. If wrong role → their own dashboard.
const ProtectedRoute = ({
  user,
  allowedRoles,
  children,
  redirectTo = "/login",
}) => {
  if (!user) return <Navigate to={redirectTo} replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }
  return children;
};

// ── AppContent ────────────────────────────────────────────────────────────────
function AppContent() {
  const navigate = useNavigate();

  // Single user state for ALL roles — role field drives routing
  const [currentUser, setCurrentUser] = useState(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    text: "",
    type: "info",
    show: false,
  });

  const toastTimerRef = useRef(null);

  // ── Re-hydrate session on mount ─────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    checkCurrentUser()
      .then((user) => {
        if (!isMounted) return;
        if (user) {
          setCurrentUser(user);
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
      })
      .finally(() => {
        if (isMounted) setAuthChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Clear toast timer on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Callbacks ─────────────────────────────────────────────────────────────────
  const showMessage = useCallback((text, type = "info") => {
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
        setCurrentUser(null);
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        setLoading(false);
        navigate("/", { replace: true });
      });
  }, [navigate, showMessage]);

  // ── Block render until session is verified ────────────────────────────────────
  if (authChecking) return <PageLoader />;

  const role = currentUser?.role;

  return (
    <div className="App">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <BackButton />

      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public ── */}
            <Route path="/" element={<HomePage />} />

            {/* ── Auth: /login and /register ── */}
            <Route
              path="/login"
              element={
                currentUser ? (
                  <Navigate to={getDashboardRoute(role)} replace />
                ) : (
                  <UnifiedAuthPage
                    mode="login"
                    setCurrentUser={setCurrentUser}
                    setLoading={setLoading}
                    showMessage={showMessage}
                    currentUser={currentUser}
                  />
                )
              }
            />

            <Route
              path="/register"
              element={
                currentUser ? (
                  <Navigate to={getDashboardRoute(role)} replace />
                ) : (
                  <UnifiedAuthPage
                    mode="register"
                    setCurrentUser={setCurrentUser}
                    setLoading={setLoading}
                    showMessage={showMessage}
                    currentUser={currentUser}
                  />
                )
              }
            />

            {/* ── Legacy redirects: old URLs keep working ── */}
            <Route
              path="/student-auth"
              element={<Navigate to="/login" replace />}
            />
            {/* <Route
              path="/admin-auth"
              element={<Navigate to="/login" replace />}
            /> */}

            {/* ── Complete Profile (students only) ── */}
            <Route
              path="/complete-profile"
              element={
                currentUser && role === "student" ? (
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
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* ── Student Dashboard ── */}
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute user={currentUser} allowedRoles={["student"]}>
                  {currentUser?.profileCompleted ? (
                    <StudentDashboard
                      currentUser={currentUser}
                      setLoading={setLoading}
                      showMessage={showMessage}
                    />
                  ) : (
                    <Navigate to="/complete-profile" replace />
                  )}
                </ProtectedRoute>
              }
            />
            {/* ── Management Dashboard ── */}
            <Route
              path="/management-dashboard"
              element={
                <ProtectedRoute
                  user={currentUser}
                  allowedRoles={["admin", "director", "security"]}
                >
                  <ManagementDashboard
                    currentUser={currentUser}
                    setLoading={setLoading}
                    showMessage={showMessage}
                  />
                </ProtectedRoute>
              }
            />
            {/* ── Catch-all ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>

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
