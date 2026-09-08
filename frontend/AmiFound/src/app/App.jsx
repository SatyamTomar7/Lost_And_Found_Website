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
import { FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import {
  checkCurrentUser,
  clearAuthSession,
  getAuthToken,
  logout,
} from "../features/auth/services/authService";
import { getDashboardRoute } from "../features/auth/constants";
import "../shared/styles/App.css";
import loaderStyles from "../shared/ui/Loader.module.css";
import buttonStyles from "../shared/ui/Button.module.css";
import BackButton from "../shared/components/BackButton";
import Header from "../shared/components/Header";
import MessageToast from "../shared/components/MessageToast";
import LoadingOverlay from "../shared/components/LoadingOverlay";
import AccessDeniedPage from "../shared/pages/AccessDeniedPage";
import NotFoundPage from "../shared/pages/NotFoundPage";

const HomePage = lazy(() => import("../features/home/pages/HomePage"));
const UnifiedAuthPage = lazy(() => import("../features/auth/pages/AuthPage"));
const StudentDashboard = lazy(
  () => import("../features/student-dashboard/pages/StudentDashboardPage"),
);
const ManagementDashboard = lazy(
  () =>
    import("../features/management-dashboard/pages/ManagementDashboardPage"),
);
const SuperAdminDepartmentPage = lazy(
  () => import("../features/admin-management/pages/SuperAdminDepartmentPage"),
);
const CompleteProfile = lazy(
  () => import("../features/complete-profile/pages/CompleteProfilePage"),
);

const PageLoader = () => (
  <div className={loaderStyles["page-loader"]}>
    <div className={loaderStyles["loading-spinner"]}>
      <FaSpinner className={loaderStyles["spin-icon"]} />
      <p>Loading...</p>
    </div>
  </div>
);

const SessionRecoveryScreen = ({ message, onRetry, onGoToLogin }) => (
  <div className={loaderStyles["page-loader"]}>
    <div className={loaderStyles["loading-spinner"]}>
      <FaExclamationTriangle className={loaderStyles["chunk-error-icon"]} />
      <p>{message}</p>
      <div className={loaderStyles["session-recovery-actions"]}>
        <button
          className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]}`}
          onClick={onRetry}
        >
          Retry Session Restore
        </button>
        <button
          className={`${buttonStyles.btn} ${buttonStyles["btn--outline"]}`}
          onClick={onGoToLogin}
        >
          Go To Login
        </button>
      </div>
    </div>
  </div>
);

class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryKey: prev.retryKey + 1,
    }));
  };

  componentDidCatch(error, info) {
    console.error("[ChunkErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={loaderStyles["page-loader"]}>
          <div className={loaderStyles["loading-spinner"]}>
            <FaExclamationTriangle
              className={loaderStyles["chunk-error-icon"]}
            />
            <p>
              Failed to load page. Please check your connection and refresh.
            </p>
            <button
              className={`${buttonStyles.btn} ${buttonStyles["btn--primary"]} ${loaderStyles["chunk-retry-btn"]}`}
              onClick={this.handleRetry}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}

const ProtectedRoute = ({
  user,
  allowedRoles,
  children,
  redirectTo = "/login",
}) => {
  if (!user) return <Navigate to={redirectTo} replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDeniedPage currentUser={user} allowedRoles={allowedRoles} />;
  }

  return children;
};

const ManagementDashboardRoute = ({ currentUser, setLoading, showMessage }) => (
  <ManagementDashboard
    currentUser={currentUser}
    setLoading={setLoading}
    showMessage={showMessage}
  />
);

function AppContent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authRecoveryError, setAuthRecoveryError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    text: "",
    type: "info",
    show: false,
  });
  const toastTimerRef = useRef(null);

  const restoreSession = useCallback(async () => {
    setAuthChecking(true);
    setAuthRecoveryError("");

    try {
      const result = await checkCurrentUser();

      if (result.shouldLogout) {
        clearAuthSession();
        setCurrentUser(null);
        return;
      }

      if (result.user) {
        setCurrentUser(result.user);
        return;
      }

      if (result.hasToken || getAuthToken()) {
        setAuthRecoveryError(
          result.errorType === "server"
            ? "We couldn't restore your session because the server is temporarily unavailable. Please retry."
            : "We couldn't reach the server to restore your session. Please retry.",
        );
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("[Session Recovery]", error);

      if (getAuthToken()) {
        setAuthRecoveryError(
          "We couldn't restore your session right now. Please retry.",
        );
      }
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const showMessage = useCallback((text, type = "info") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    let normalizedText = "";

    if (typeof text === "string") {
      normalizedText = text;
    } else if (text?.message && typeof text.message === "string") {
      normalizedText = text.message;
    } else {
      try {
        normalizedText = JSON.stringify(text);
      } catch {
        normalizedText = "Something went wrong";
      }
    }

    setMessage({
      text: normalizedText,
      type,
      show: true,
    });

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
        clearAuthSession();
        setLoading(false);
        navigate("/", { replace: true });
      });
  }, [navigate, showMessage]);

  const handleRecoveryLoginRedirect = useCallback(() => {
    clearAuthSession();
    setCurrentUser(null);
    setAuthRecoveryError("");
    navigate("/login", { replace: true });
  }, [navigate]);

  if (authChecking) return <PageLoader />;

  if (authRecoveryError) {
    return (
      <SessionRecoveryScreen
        message={authRecoveryError}
        onRetry={restoreSession}
        onGoToLogin={handleRecoveryLoginRedirect}
      />
    );
  }

  const role = currentUser?.role;

  return (
    <div className="App">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <BackButton />

      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />

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

            <Route
              path="/student-auth"
              element={<Navigate to="/login" replace />}
            />
            <Route
              path="/admin-auth"
              element={<Navigate to="/login" replace />}
            />

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

            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute user={currentUser} allowedRoles={["admin"]}>
                  <ManagementDashboardRoute
                    currentUser={currentUser}
                    setLoading={setLoading}
                    showMessage={showMessage}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/security-dashboard"
              element={
                <ProtectedRoute user={currentUser} allowedRoles={["security"]}>
                  <ManagementDashboardRoute
                    currentUser={currentUser}
                    setLoading={setLoading}
                    showMessage={showMessage}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/director-dashboard"
              element={
                <ProtectedRoute user={currentUser} allowedRoles={["director"]}>
                  <ManagementDashboardRoute
                    currentUser={currentUser}
                    setLoading={setLoading}
                    showMessage={showMessage}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/super-admin/departments"
              element={
                <ProtectedRoute
                  user={currentUser}
                  allowedRoles={["super_admin"]}
                >
                  <SuperAdminDepartmentPage showMessage={showMessage} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/management-dashboard"
              element={
                currentUser ? (
                  <Navigate to={getDashboardRoute(role)} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/access-denied"
              element={<AccessDeniedPage currentUser={currentUser} />}
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ChunkErrorBoundary>

      <LoadingOverlay show={loading} />
      <MessageToast message={message} onClose={handleCloseMessage} />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
